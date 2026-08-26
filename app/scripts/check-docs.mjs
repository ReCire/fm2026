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
const PRIMITIVE = /<(Button|StatChip)\b([^>]*)>/g;
const HAS_DOC = /\bdoc\s*=/;
const MATH_RANDOM = /Math\.random\s*\(/;

const problems = [];
const stats = { files: 0, controls: 0, docIds: 0 };

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

/** Blank out comments while preserving line numbers. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
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

  if (!file.endsWith('.svelte')) continue;

  // Rule 2: our primitives need a doc id.
  for (const m of text.matchAll(PRIMITIVE)) {
    stats.controls++;
    if (!HAS_DOC.test(m[2])) {
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
    `${docIds.size} entries across ${stats.files} files.`
  );
  process.exit(0);
}

console.error(`${RED}✗ docs gate: ${problems.length} problem(s)${RESET}\n`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}  ${DIM}[${p.rule}]${RESET}\n    ${p.message}\n`);
}
console.error('Undocumented UI does not ship. See src/lib/docs/registry.ts.');
process.exit(1);
