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

The split is by **seam**, not by folder. Three sessions work in the same feature
directories at the same time; they touch different files in them.

| | fm-03-design owns | senior-frontend owns | architecture owns |
|---|---|---|---|
| **A feature** | `Screen.svelte`, `content.ts`, `docs.ts` — except matchday | `matchday/Screen.svelte`, `matchday/LiveMatch.svelte` | `module.ts`, `state.ts`, `rules.ts`, `rules.test.ts` |
| **Shared code** | `design/tokens.css`, `src/lib/graphics/` | `src/lib/ui/` | `src/lib/engine/`, `src/lib/state/`, `src/lib/shell/`, `src/lib/docs/registry.ts` |
| **The app shell** | — | all of `src/routes/`, `+layout.svelte` included | `src/lib/shell/` — which modules appear, what is reachable, what is new |
| **Everything else** | game design, balance, copy, German | primitives, chrome, mobile craft, motion | `modules.ts`, `scripts/`, `.github/`, `content/` schemas |

Matchday's two files sit with senior-frontend permanently rather than as a
loan. It is the centrepiece Eric named — the match you watch — it was written
as structure with the visual language deliberately left out, and nobody else was
going to reach it soon.

`+layout.svelte` went across whole, including the attention badges, rather than
being split by intent. The floating tab bar is most of that file's work, and
"you own the chrome, I own the badges inside it" is precisely the
convention-not-a-seam problem.

Why that line: **`rules.ts` is how a mechanic computes, `content.ts` is what the
numbers are.** Splitting there is what lets balance be retuned without an
engineer and refactored without a designer. `Screen.svelte` follows the design
side because it is presentation; the logic it calls lives in `rules.ts`.

`src/routes/+layout.svelte` is presentation; the data it renders comes from
`src/lib/shell/`. A convention about which half of one file you may edit is not
a seam — **a seam has to be something you can `git log`.**

Why `ui/` and `routes/` split away from the rest of design: primitives and
chrome are craft, feature screens are mostly game design and German copy. Two
different jobs that happened to share a folder.

`design/tokens.css` stays with fm-03-design and is the one file allowed to
define a colour. Its values carry audits in their own comments — `--text-2` sits
deliberately off-spec because the spec's value measured 3.56:1, and `--pos-ink`
and `--neg-ink` are 137° apart so that red against green is never the only
channel. A change made on aesthetic grounds would silently undo a measurement,
and the docs gate cannot see intent. Anyone may propose a token; its owner
applies it.

**Lending a file is allowed; taking one is not.** A screen's owner may hand a
specific file to another session when they will not get to it — say so in the
commit body, so the exception is in the log rather than in somebody's memory.
That is the release valve that stops the seam turning into a queue.

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
the live build on his phone while work continues.

His push does NOT move anything under you — it sends local `main` to the
remote and leaves the working tree exactly as it was. What moves under you is
**another session committing**, which happens constantly. Assume the tree has
changed since you last looked at it.

1. **Stage explicitly.** `git add <paths>`, never `-A` or `.`. With three
   sessions in one tree, `-A` sweeps up somebody else's half-written file and
   commits it under your name. `git status` will routinely show work that is
   not yours; leave it alone.

2. **Never `stash`, `checkout`, `restore` or `clean` a path you do not own.**
   Not even to check something. I stashed a peer's in-flight component to see
   whether a type error was mine, and the stash took an untracked file of
   theirs with it — recovered, but only because I noticed within a minute.
   There is no version of that which is worth the answer you get.

   If you need to know whether a failure is yours, read the file. Do not move
   it.
3. **Commit under your own identity**, per command, so nothing shared changes:

   ```bash
   git -c user.name="fm-03-design"   -c user.email="fm-03@local"    commit -m "…"
   git -c user.name="senior-frontend" -c user.email="frontend@local" commit -m "…"
   git -c user.name="architecture"    -c user.email="arch@local"     commit -m "…"
   ```

   Without this every commit reads as `ReCire`, including Eric's, and nobody can
   tell who did what afterwards.

## Wire the provider first, the consumer second

A context key that is **provided and unread** is inert. The tick runs, nothing
uses the value, nobody notices.

A context key that is **read and unprovided** refuses to boot the registry —
and because every test file builds one, that is the entire suite red for every
session in the tree, not just yours.

The asymmetry is complete and it is entirely in the ordering of two edits. So
when you add an effect: write the `provides`/`contributes` side first, commit or
at least land it in the tree, and only then add the `consumes`. If you are
interrupted between the two, you have left something harmless behind instead of
a stop-the-world.

Three keys went in the wrong order in one week — `training.devPerSeason`,
`youth.startStrength`, `league.level` — all in the same direction, all taking
26 test files down with them. The check is right to be strict; the cost of an
in-flight edit is what the ordering fixes.

Related, and the same shape one level up: **an effect must exist on every tick
kind that reads it.** A value contributed on `matchday` is not there on `week`,
and the registry will tell you so by refusing to start.

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
