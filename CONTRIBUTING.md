# Working agreement

Two Claude sessions build this repo in parallel, and Eric pushes.

## Who does what

| | Owns | Files |
|---|---|---|
| **fm-03-design** | Game design, mechanics, balance, and everything the player sees and feels — layout, colour, motion, accessibility, copy, the parody layer | `index.html`, `sw.js`, `icons/`, `manifest.webmanifest` |
| **architecture** | The machinery underneath — engine, state, data model, build, CI, tests, documentation system, the port | `app/`, `.github/`, `app/content/` |
| **Eric** | Direction, and every `git push` | — |

Shared, ping before editing: `.claude/launch.json`, `CONTRIBUTING.md`, `README.md`.

## Git

**Agents commit. Only Eric pushes.** He pushes mid-flight on purpose, to test
the live Vercel build on his phone while work continues. So `main` may move
under you at any time — that is expected, not a problem.

Two rules that follow from it:

1. **Stage explicitly.** `git add index.html sw.js`, never `git add -A` or
   `git add .`. The other session's tree may be mid-write, and `app/` has
   generated directories.
2. **Commit under your own identity**, passed per command so nothing shared
   changes:

   ```bash
   git -c user.name="fm-03-design" -c user.email="fm-03@local" commit -m "…"
   git -c user.name="architecture" -c user.email="arch@local" commit -m "…"
   ```

   Without this every commit reads as `ReCire`, including Eric's, and nobody
   can tell who did what after the fact.

## Design intent

When you tune a number, record why — not what it does, but what breaks if
someone changes it. Those go in `app/src/lib/docs/design-intent.ts` and become
the `why` field of the matching control in the generated manual.

The bar is the failure mode, not the mechanic:

> `injuryBaseRisk = 0.055` — at 0.08 you lose a starter most weeks and rotation
> stops being a choice you make: it becomes triage, and the depth-versus-quality
> decision the whole transfer market is built around collapses.

That is knowledge no reader could recover from the code, which is exactly why it
is written down.

## The port

`index.html` stays the live, playable game and the reference implementation
until `app/` catches up. It growing is expected. Nothing in it is throwaway:
it is what Eric tests on, and it is the spec the port is written against.
