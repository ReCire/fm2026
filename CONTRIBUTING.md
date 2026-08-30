# Working agreement

Two Claude sessions build this repo in parallel, and Eric pushes.

## The current phase: both sessions work in `app/`

`index.html` is **frozen**. It stays deployed and playable, and it is the
reference implementation the port is written against — but no new work goes into
it. Everything new is built in `app/`, by both sessions, so the single file can
be retired.

If something in the prototype needs to change to keep it running, that is fine.
New features are not.

## Who owns what, inside `app/`

The split is by **seam**, not by folder. Both sessions work in the same feature
directories at the same time; they touch different files in them.

| | fm-03-design owns | architecture owns |
|---|---|---|
| **A feature** | `Screen.svelte`, `content.ts`, `docs.ts` | `module.ts`, `state.ts`, `rules.ts`, `rules.test.ts` |
| **Shared code** | `src/lib/ui/`, `src/lib/design/`, `src/lib/graphics/` | `src/lib/engine/`, `src/lib/state/`, `src/lib/shell/`, `src/lib/docs/registry.ts` |
| **The app shell** | `src/routes/` markup and styles | `src/lib/shell/` — which modules appear, what is reachable, what is new |
| **Everything else** | game design, balance, copy, accessibility, motion | `modules.ts`, `scripts/`, `.github/`, `content/` schemas |

Why that line: **`rules.ts` is how a mechanic computes, `content.ts` is what the
numbers are.** Splitting there is what lets balance be retuned without an
engineer and refactored without a designer. `Screen.svelte` follows the design
side because it is presentation; the logic it calls lives in `rules.ts`.

`src/routes/+layout.svelte` is presentation and belongs to design; the data it
renders comes from `src/lib/shell/`. A convention about which half of one file
you may edit is not a seam — a seam has to be something you can `git log`.

**Nobody edits `src/lib/modules.ts` except architecture.** It is the one global
list and the one place a merge conflict would actually hurt.

When you need something on the other side of the line, ask rather than reach
across. It is usually a five-line addition and always faster than an unpick.

## Before every commit

```bash
cd app && npm run verify      # typecheck + docs gate + tests
```

Not optional, and not only for the session that wrote logic. The docs gate fails
the build on an undocumented control, a `doc` id that resolves to nothing, and
`Math.random()` inside a rules file — those are the guardrails that make it safe
for two people to move fast in one directory.

## Git

**Agents commit. Only Eric pushes.** He pushes mid-flight on purpose, to test
the live build on his phone while work continues, so `main` may move under you.

1. **Stage explicitly.** `git add <paths>`, never `-A` or `.`.
2. **Commit under your own identity**, per command, so nothing shared changes:

   ```bash
   git -c user.name="fm-03-design" -c user.email="fm-03@local" commit -m "…"
   git -c user.name="architecture"  -c user.email="arch@local"  commit -m "…"
   ```

   Without this every commit reads as `ReCire`, including Eric's, and nobody can
   tell who did what afterwards.

## Three rules that came out of real bugs

**Vary the input across its range and assert the output moves.** Every tuneable
gets a test that changes it and asserts something downstream changes. It does
not need to know the direction. This is the test that would have caught all four
of our invisible-stat bugs: an executive's competence that resolved nowhere, a
crest's initials that were the same colour as the field behind them, a lineup
that never reached the simulation, and a fitness cost that was documented,
computed, and never wired.

**A screenshot confirms what you expect to see.** Verify by querying the
artifact, not by looking at it: assert the element exists, assert its value
equals the expected one, assert it is absent where it should be absent.

**Write the assertion from what should be true, never from what the code
does.** A test written by reading the implementation cannot fail, because it
was derived from the thing it is checking — and if the implementation is wrong,
the test now records the bug as the design and stays green forever.

We shipped one. `engine.test.ts` demonstrated the "no migration, so reset that
slice" path using `squad` as its example — which was accurate, because squad
exported a `migrateSquad` its module had never registered. Every version bump
since v2 had no upgrade path at all, and the test that would have caught it was
instead describing it as intended behaviour. It would never have gone red.

That is worse than a missing test. A missing test leaves a gap you might
notice; this one fills the gap with a wrong answer.

The tell is checkable in review: **if a test's assertion is the same sentence as
the implementation's comment, one of the two is redundant, and it is usually the
test.** `expect(catalogue).toHaveLength(24)` is reading your own array back.
`expect(everySynthesisNode).toHaveTwoDoctrines()` is a claim about what a
synthesis IS.

The three rules catch three different failures. The first catches a tuneable
that reaches nothing. The second catches a mechanism that works where the
player cannot get at it. The third catches a tuneable deliberately set to the
wrong value, and a mechanism that is wrong on purpose because somebody wrote
the test last.

## Design intent

When you tune a number, record why in `app/src/lib/docs/design-intent.ts` — not
what it does, but what breaks if someone changes it. The bar is the failure
mode, not the mechanic:

> `injuryBaseRisk = 0.055` — at 0.08 you lose a starter most weeks and rotation
> stops being a choice you make: it becomes triage, and the depth-versus-quality
> decision the whole transfer market is built around collapses.

That is knowledge no reader could recover from the code, which is exactly why it
is written down. A test enforces that every entry has both a rationale and a
failure mode.
