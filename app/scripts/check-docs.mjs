#!/usr/bin/env node
/**
 * The documentation gate.
 *
 * Fails the build when an interactive control ships without a registry entry,
 * or when a rules file reaches for Math.random() and breaks determinism.
 *
 * This is deliberately a build step and not a convention: conventions rot, and
 * the whole point of the doc registry is that the manual is still complete in
 * two years. Heuristic by design — it reads source text rather than a compiled
 * AST — so it errs towards reporting, and every rule can be silenced inline
 * with a `docs-check-ignore` comment on the line above when there is a real
 * reason.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const IGNORE = 'docs-check-ignore';

/** Raw <button>/<a>/<input> in a screen: should be a documented primitive. */
const RAW_CONTROL = /<(button|input|select|textarea)\b(?![^>]*\bdocs-check-ignore\b)/g;
/** Our own primitives must carry a doc id. */
const PRIMITIVE_OPEN = /<(Button|StatChip)\b/g;
const HAS_DOC = /\bdoc\s*=/;
const MATH_RANDOM = /Math\.random\s*\(/;

/**
 * Fills on `background`, ink on `color`.
 *
 * A domain colour is two tokens: `--x` fills a field, `--x-ink` sets type on
 * one. They are not interchangeable — a saturated green reads both ways on a
 * dark ground and neither way on parchment, which is why the split exists.
 *
 * This is worth a mechanical rule because it has recurred three times, and each
 * time in code written by someone who knew the rule: it survives because
 * `var(--primary)` is the obvious name to reach for and nothing objects. The
 * pairs are discovered from tokens.css rather than listed here, so adding a
 * domain colour puts it under the rule automatically.
 */
const COLOUR_PROP = /(^|[;{\s])color\s*:\s*var\(\s*--([a-z0-9-]+)\s*[,)]/gi;

/**
 * A token name composed at runtime, e.g. `var(--{accent}-ink)`.
 *
 * This defeats every static check downstream, and it hid a real bug: `Panel`
 * built `var(--{accent})` from a prop and painted its title with it, so every
 * panel heading in the game was a FILL used as type — 2.81:1 on the light card.
 * The fill/ink rule was already in place and could not see it, because there is
 * no literal token name to find.
 *
 * So the interpolation itself is what gets flagged. It is not forbidden — a
 * `docs-check-ignore` still allows it — but it has to be a decision someone
 * made on purpose, because nothing after it can be verified.
 */
const DYNAMIC_TOKEN = /var\(\s*--\{/g;

/** Every `var(--name)` read, so undefined ones can be caught. */
const TOKEN_USE = /var\(\s*--([a-z0-9-]+)\s*([,)])/gi;
/** Every `--name:` definition, wherever it is declared. */
const TOKEN_DEF = /--([a-z0-9-]+)\s*:/gi;

const problems = [];
const stats = { files: 0, controls: 0, docIds: 0, inkPairs: 0 };

/**
 * Roles that have BOTH a fill and an ink, read from the token file itself.
 *
 * Requiring both matters: some inks are deliberately ink-only. `--pos-ink` and
 * `--neg-ink` are STATUS colours — money going up is not a department — and
 * `--c-under-ink` likewise has no field to fill. Treating those as fills would
 * inflate the count and, worse, produce a message telling someone to stop using
 * a token that does not exist. The rule guards the fill/ink split; a token with
 * no fill has no split to get wrong.
 */
async function inkRoles() {
  const tokens = await readFile(join(SRC, 'lib/design/tokens.css'), 'utf8');
  const inks = new Set();
  const fills = new Set();
  for (const m of tokens.matchAll(/--([a-z0-9-]+)-ink\s*:/gi)) inks.add(m[1]);
  for (const m of tokens.matchAll(/^\s+--([a-z0-9-]+)\s*:/gim)) fills.add(m[1]);
  return new Set([...inks].filter((role) => fills.has(role)));
}
const INK_ROLES = await inkRoles();
stats.inkPairs = INK_ROLES.size;

/**
 * Every custom property defined anywhere in src.
 *
 * CSS drops an undefined `var()` WITHOUT COMPLAINT — no error, no warning,
 * nothing in the build. Retiring the spacing aliases left eight uses of
 * `--sp-1..4` resolving to nothing, and the gaps were simply zero. Same silent
 * shape as everything else, in a new medium.
 *
 * Definitions are collected from the whole tree, not just tokens.css, because a
 * component may legitimately declare its own (`--panel-accent`). Inline
 * `style="--x: …"` counts too.
 */
async function definedTokens() {
  const defined = new Set();
  for await (const file of walk(SRC)) {
    if (!file.endsWith('.css') && !file.endsWith('.svelte')) continue;
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(TOKEN_DEF)) defined.add(m[1]);
  }
  return defined;
}
const DEFINED_TOKENS = await definedTokens();

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

/**
 * Blank out comments while preserving line numbers.
 *
 * HTML comments are stripped too. Without that, describing a rule in a
 * `<!-- -->` block trips the rule — which happened the moment the dynamic-token
 * check landed, on the very comment explaining why it exists. Same shape as the
 * determinism check firing on prose about Math.random().
 */
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * Return a tag's attribute text, from the tag name to its real closing `>`.
 *
 * A naive non-greedy character-class scan breaks on the first `>` inside an
 * attribute expression: `value={a > 0 ? 'x' : 'y'}` ends the scan early and
 * the doc id after it is never seen. That produced a false positive on a
 * correctly documented control — precisely how a build gate earns its way
 * into being switched off. So: walk forward tracking brace depth and quotes.
 */
function attributesOf(text, from) {
  let depth = 0;
  let quote = null;
  // A tag is never this long. Bailing out loudly beats scanning to the end of
  // the file and matching a `doc=` that belongs to some unrelated component
  // hundreds of lines later — a false NEGATIVE, which silently switches the
  // gate off, is far worse than the false positive this parser replaced.
  const LIMIT = Math.min(text.length, from + 2000);

  for (let i = from; i < LIMIT; i++) {
    const ch = text[i];

    if (quote) {
      // Escapes matter: an apostrophe in `() => alert('don\'t')` used to end
      // the string early and run the scan off into the rest of the file.
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth++; continue; }
    // Clamp: a stray `}` must not push depth negative and disarm the exit test.
    if (ch === '}') { depth = Math.max(0, depth - 1); continue; }
    if (ch === '>' && depth === 0) return { attrs: text.slice(from, i), ok: true };
  }

  // Ran past the limit or hit EOF: report rather than guess.
  return { attrs: text.slice(from, LIMIT), ok: false };
}

function precededByIgnore(text, index) {
  const start = text.lastIndexOf('\n', text.lastIndexOf('\n', index - 1) - 1);
  return text.slice(Math.max(0, start), index).includes(IGNORE);
}

const docIds = new Set();

for await (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const text = await readFile(file, 'utf8');
  stats.files++;

  // Collect declared doc ids so we can cross-check references.
  if (file.endsWith('docs.ts') || file.endsWith('module.ts')) {
    for (const m of text.matchAll(/'([a-z][a-zA-Z]*\.[a-zA-Z]+)'\s*:\s*\{/g)) {
      docIds.add(m[1]);
      stats.docIds++;
    }
  }

  // Rule 1: rules.ts must be deterministic. Comments are stripped first —
  // explaining the rule in prose must not trip the rule.
  const code = stripComments(text);
  if (/rules\.ts$/.test(file) && MATH_RANDOM.test(code)) {
    problems.push({
      file: rel,
      line: lineOf(code, code.search(MATH_RANDOM)),
      rule: 'determinism',
      message: 'Math.random() in a rules file. Take an `rng: Rng` argument instead — a season must replay from its seed.'
    });
  }

  // Rule 7: a `var(--x)` that resolves to nothing.
  if (file.endsWith('.svelte') || file.endsWith('.css')) {
    for (const m of code.matchAll(TOKEN_USE)) {
      const name = m[1];
      // `var(--x, fallback)` is a deliberate default, not an accident.
      if (m[2] === ',') continue;
      if (DEFINED_TOKENS.has(name)) continue;
      if (precededByIgnore(text, m.index)) continue;
      problems.push({
        file: rel,
        line: lineOf(code, m.index),
        rule: 'undefined-token',
        message: `var(--${name}) is not defined anywhere. CSS drops an undefined custom property silently, so this renders as nothing — a zero gap or a missing colour with no error.`
      });
    }
  }

  // Rule 6: a runtime-composed token name cannot be checked by anything.
  if (file.endsWith('.svelte') || file.endsWith('.css')) {
    // Scans the comment-stripped source: explaining the rule in prose must not
    // trip the rule. Exactly the mistake the determinism check made first.
    for (const m of code.matchAll(DYNAMIC_TOKEN)) {
      if (precededByIgnore(text, m.index)) continue;
      problems.push({
        file: rel,
        line: lineOf(code, m.index),
        rule: 'dynamic-token-name',
        message:
          'A token name built at runtime — var(--{…}) — cannot be checked for the ' +
          'fill/ink split or for existing at all. Pass the resolved token in as a ' +
          'prop, or add a "docs-check-ignore" comment to say it is deliberate.'
      });
    }
  }

  // Rule 5: a role with an ink companion must not be used as a text colour.
  if (file.endsWith('.svelte') || file.endsWith('.css')) {
    for (const m of code.matchAll(COLOUR_PROP)) {
      const role = m[2];
      if (!INK_ROLES.has(role)) continue;
      if (precededByIgnore(text, m.index)) continue;
      problems.push({
        file: rel,
        line: lineOf(code, m.index),
        rule: 'fill-used-as-ink',
        message: `color: var(--${role}) sets type in a fill colour. Use var(--${role}-ink) — a fill and its ink are two different values, and on a light ground the fill is not legible as text.`
      });
    }
  }

  if (!file.endsWith('.svelte')) continue;

  // Rule 2: our primitives need a doc id.
  for (const m of text.matchAll(PRIMITIVE_OPEN)) {
    stats.controls++;
    const { attrs, ok } = attributesOf(text, m.index + m[0].length);
    if (!ok) {
      problems.push({
        file: rel,
        line: lineOf(text, m.index),
        rule: 'unparseable-tag',
        message: `Could not find the end of this <${m[1]}> tag within 2000 characters. Usually an unbalanced quote or brace above it. Fix the markup rather than trusting the gate here.`
      });
      continue;
    }
    if (!HAS_DOC.test(attrs)) {
      problems.push({
        file: rel,
        line: lineOf(text, m.index),
        rule: 'undocumented',
        message: `<${m[1]}> without a doc id. Add one to the feature's docs.ts, then pass doc="…".`
      });
    }
  }

  // Rule 3: raw controls inside feature screens should use the primitives,
  // because that is what routes them through the registry. The shell (routes/,
  // ui/, docs/) is allowed to use raw elements.
  if (rel.startsWith('lib/features/')) {
    for (const m of text.matchAll(RAW_CONTROL)) {
      if (precededByIgnore(text, m.index)) continue;
      stats.controls++;
      problems.push({
        file: rel,
        line: lineOf(text, m.index),
        rule: 'raw-control',
        message: `Raw <${m[1]}> in a feature screen. Use the documented primitive, or add a "${IGNORE}" comment above if it genuinely needs no entry.`
      });
    }
  }
}

// Rule 4: every referenced doc id must exist.
for await (const file of walk(SRC)) {
  if (!file.endsWith('.svelte')) continue;
  const rel = relative(SRC, file);
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/\bdoc=(?:"([^"]+)"|\{'([^']+)'\})/g)) {
    const id = m[1] ?? m[2];
    if (id && !docIds.has(id)) {
      problems.push({
        file: rel,
        line: lineOf(text, m.index),
        rule: 'unknown-doc-id',
        message: `doc="${id}" is not declared in any module's docs.`
      });
    }
  }
}

const RED = '\x1b[31m', DIM = '\x1b[2m', GREEN = '\x1b[32m', RESET = '\x1b[0m';

if (problems.length === 0) {
  console.log(
    `${GREEN}✓${RESET} docs gate: ${stats.controls} controls documented, ` +
    `${docIds.size} entries across ${stats.files} files, ${stats.inkPairs} fill/ink pairs.`
  );
  process.exit(0);
}

console.error(`${RED}✗ docs gate: ${problems.length} problem(s)${RESET}\n`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}  ${DIM}[${p.rule}]${RESET}\n    ${p.message}\n`);
}
console.error('Undocumented UI does not ship. See src/lib/docs/registry.ts.');
process.exit(1);
