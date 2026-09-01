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

1. **Stage FILES, never directories.** `git add a/b/thing.ts`, never `-A`,
   never `.`, and never `git add src/lib/features/matchday`.

   The directory form is the one that catches you, because it reads as
   explicit. I staged nine feature directories for a wiring pass and committed
   117 lines of another session's half-finished component under my own name —
   having written the "stage explicitly" rule myself, and followed it to the
   letter. A directory is not a path; it is a wildcard that looks like a
   decision.

   Before you commit, read `git diff --cached --stat` and check every line of
   it is yours. With three sessions, `git status` routinely shows work that is
   not — leave it alone.

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

## The four ways a thing ships connected to nothing

Named because we keep finding the same bug wearing different clothes, and
because the fourth is the one no test catches.

| | the hole |
|---|---|
| **computed and never read** | a value exists, nothing consumes it |
| **declared and never written** | a field exists, nothing fills it |
| **tested and never reachable** | a path works, no player can get to it |
| **present and never drawn** | the data is complete, correct, loaded — and the screen renders a subset of it |

The first three all have a hole somewhere a sufficiently suspicious test can
find. The fourth has no hole at all. Every assertion about the doctrine
catalogue passed: the icons were there, the prices computed, 140 nodes had 140
names. The bug was entirely in what the template chose not to reference, and
there is no failing state to assert against — only an absence you have to
already suspect.

Eric found it by putting the prototype and the port side by side. Neither
session could have: we both knew what was supposed to be there and read it in
whether it rendered or not.

**When porting a screen, diff the FIELDS the source reads against the fields
the port reads.** Not the data — the references. That would have found `icon`
in ten seconds.

## Copy plans, the feed notices, the manual confirms

Three places a player can learn a rule, and they are not interchangeable.

| | for | holds |
|---|---|---|
| **on-screen copy** | planning | the rule a player must know *before* deciding |
| **the feed** | noticing | what just happened, once, in the moment |
| **the manual `why`** | confirming | the mechanic behind a suspicion already formed |

The test is not "is this true", it is "what does a player DO having read it".

I nearly put "a raid lowers Ermittlungsdruck" in a tooltip and thought I was
being transparent. It is true. It is also, in a tooltip, advice to get raided —
and the fine scales with the needle, so a player who follows it eats the most
expensive possible version of it. True, prominent, and a trap.

The same fact belongs in the feed, where the raid and its resolution are two
lines and the needle visibly falls between them: found out once, unmissable,
never repeated. And in the manual, where a player goes to confirm a suspicion
they already have. **Confirming is not advertising.**

The rule that must be in the copy is the one being planned against: the file
closes below 25, and the board's target is printed in October. Being punished
by a number you were never shown is the worst thing this game can do — and
"you can lower the meter by getting raided" is the same sentence pointed the
other way.

## Write the test from the claim, not from the code

Both real bugs found on the day this was written came from a test written
against a sentence about what should be true:

- *"a board must never sack a manager for the place it asked him to reach"* —
  found a published target of 17th with a failure line at 16th.
- *"a club that stops must be able to get clean"* — found a fixed point at 60%
  where a manager who sold every node they owned was raided forever.

Neither is a reading of the function it broke. Both are design claims, and
that is why they could disagree with the implementation at all.

The failure mode is the same tell as a test that encodes a bug, pointed the
other way. The press meter's unit test was written from the code, so it
modelled a raid as publishing ONE story — the code publishes two, the raid and
the fine — and it passed while the real system diverged. The integration test,
which ran a season instead of modelling one, found it in a second.

**Model the system in one test and run it in another. Only one of them can be
wrong about what the system contains.**

### Three ways a test is the thing that is wrong

All three were collected in one afternoon, and all three read as green or as a
bug report about the code.

| | the tell | ours |
|---|---|---|
| **written from the code** | it models the implementation, so it agrees with it by construction | the press unit test counted a raid as publishing ONE story; the code publishes two, and the real meter settled at a permanent 60% |
| **under-powered** | it fails, and the failure describes the test rather than the system | "the final can be lost" at strength 70 — a 70 reaches one final in two hundred seasons |
| **claims more than it asserts** | the comment is the coverage; the assertion is not | "no two narratives share an unlock order", asserting `> 1` distinct — which only rules out all five being identical, and two had been matching for weeks |
| **green for an unrelated reason** | it passes, and would pass with the system removed | five harnesses double-stepped the clock; the europe suite survived only because every European matchday is an odd number, and an every-other-week clock lands on odd numbers |

The second is the dangerous one to debug, because a red test is normally the
system's problem. **Measure before you change the code it accuses.** Running
the tournament 200 times took a minute and turned a suspected bug into a
distribution worth keeping.

The third is worse than no test, because it gets read as coverage. If the
comment says "no two", the assertion says no two.

The fourth is the one you will find last, because the other three either fail
or read wrong and this one is green and silent. It surfaced from outside: a
report that badges "never seem to land" on a real save. Nothing in the suite
was ever going to say so — change `groupMatchdays` to `[2, 6, 10, …]` and a
tournament suite goes red for a reason that has nothing to do with tournaments.

**When a harness sets up state the engine also maintains, check which of you is
doing it.** `runTick` advances the matchday, the tick and the season by itself.


## If a screen computes it, move it one file down

There is no component test in this project. So anything a surface derives can
only ever be checked by looking at it — and the cases worth checking are
usually the ones that are awkward to produce in a live save.

Three instances, found separately by three sessions before anybody named it:

| computed in | moved to | the case it was hiding |
|---|---|---|
| `Leaderboard.svelte` | `ui/rank.ts` | ties share a rank and the next one skips: 1, 2, 2, 4 |
| `matchday/Screen.svelte` | rules | `subSwing` and the trade badges |
| `progression/Screen.svelte` | `content/badges.ts` | a secret badge already earned — and a save holding a badge whose feature was later removed, which made a career read 23 of 22 |

The last one is the argument. It was in neither the screen's version nor the
review of it, and it appeared the moment the logic became a function, because
**writing "what should be true" for a function forces the question "what could
be handed to this"** — which staring at a `$derived` over one live save never
asks. You get one state per save; you get every state per test.

The rule is not "extract everything". A screen mapping a field to a label is a
screen. The line is whether you would want to assert it: if the answer is yes,
it is logic that happens to live in a template, and it belongs one file down.

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
