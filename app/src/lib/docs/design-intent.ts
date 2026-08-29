/**
 * Design intent: why the numbers are the numbers.
 *
 * A tuned constant carries a decision that the code itself cannot express.
 * `0.055` looks like a value you could round to `0.05` while tidying up; it is
 * actually the line between "rotation is a choice you make" and "rotation is
 * triage". That reasoning normally lives in one person's head and is lost the
 * first time someone refactors.
 *
 * So it lives here instead, as typed data, until the module that owns it is
 * ported — at which point its `rationale` becomes that control's `why` field in
 * the doc registry and appears in the generated manual.
 *
 * `design-intent.test.ts` asserts every entry is complete and that nothing is
 * silently orphaned.
 */

export interface DesignIntent {
  /** Dotted id: the module that will own it, then the constant. */
  id: string;
  /** The constant as it appears in code. */
  constant: string;
  /** Its value at the time the decision was made. */
  value: string;
  /** Why this value and not another. Written as a design constraint. */
  rationale: string;
  /**
   * What breaks if someone "cleans this up". The single most useful field:
   * it turns a magic number into a tripwire.
   */
  failureMode: string;
  /** Module id this belongs to once ported. */
  module: string;
  /** Who determined it, so the reasoning can be traced back. */
  source: string;
}

function defineIntent<T extends readonly DesignIntent[]>(entries: T): T {
  return entries;
}

export const designIntent = defineIntent([
  // ---------------------------------------------------------------- squad --
  {
    id: 'squad.injuryBaseRisk',
    constant: 'injuryBaseRisk',
    value: '0.055 per starter per match',
    rationale:
      'Tuned so a 20-match run produces roughly 2–3 concurrent injuries — enough that squad depth matters, few enough that the manager still chooses who rests.',
    failureMode:
      'At 0.08 you lose a starter most weeks and rotation stops being a choice you make: it becomes triage, and the depth-versus-quality decision the whole transfer market is built around collapses.',
    module: 'squad',
    source: 'fm-03-design'
  },
  {
    id: 'squad.redCardChance',
    constant: 'redCardChance',
    value: '0.022 per match, ban 1–2 matches',
    rationale:
      'Deliberately an order of magnitude rarer than injuries. A suspension is punctuation, not a system.',
    failureMode:
      'At 0.05 you would plan around suspensions every other week, and they would compete with injuries for the same "who plays Saturday" tension instead of interrupting it.',
    module: 'squad',
    source: 'fm-03-design'
  },

  // ------------------------------------------------------------- doctrine --
  {
    id: 'doctrine.synthesisGate',
    constant: 'synthesisGate',
    value: 'rank 6 neutral / 5 allied / 8 hostile',
    rationale:
      'Rank 6 in two doctrines is ~12 nodes ≈ 30 WP against an income of ~5 WP per season — roughly six seasons of everything. A synthesis is meant to cost a career direction, not be a purchase.',
    failureMode:
      'Lower it and syntheses become something you collect rather than something you commit to, which removes the only irreversible choice in the progression.',
    module: 'doctrine',
    source: 'fm-03-design'
  },
  {
    id: 'doctrine.pactThreshold',
    constant: 'pactThreshold',
    value: 'min(rank) >= 4, magnitude = depth - 3',
    rationale:
      'Below rank 4 the interaction is noise. The -3 offset makes the first pact tier worth exactly 1, so the player sees a small effect appear and can attribute it before it grows.',
    failureMode:
      'Without the offset the first pact arrives already large, and the player cannot tell which of their choices caused it.',
    module: 'doctrine',
    source: 'fm-03-design'
  },
  {
    id: 'doctrine.friction',
    constant: 'frictionFans / frictionPress',
    value: '0.6 fans, 0.4 press per magnitude point',
    rationale:
      'Sized to be felt but survivable. A hostile hybrid should be a real cost you accept knowingly.',
    failureMode:
      'Too high and a hostile build quietly stops working, which reads as a bug rather than a trade-off.',
    module: 'doctrine',
    source: 'fm-03-design'
  },
  {
    id: 'doctrine.effectCaps',
    constant: 'effectCaps',
    value: 'transferDiscount 0.6, injuryRisk -0.92, wageMod -0.55',
    rationale:
      'Ceilings on stacked endgame builds, so the economy remains a system the player operates inside.',
    failureMode:
      'Uncapped, a maxed build reaches free transfers and zero injuries — at which point the economy is no longer a system, and every mechanic downstream of it stops mattering.',
    module: 'doctrine',
    source: 'fm-03-design'
  },

  // ------------------------------------------------------------- matchday --
  {
    id: 'matchday.roleDrift',
    constant: 'roleDrift',
    value: 'gk 0.03 / def 0.10 / mid 0.20 / att 0.16',
    rationale:
      'Per-line coefficients are about legibility, not realism. Midfield oscillates widest because that is where the ball actually moves; the keeper is near-static to give a fixed reference point to read the rest against.',
    failureMode:
      'A single shared coefficient makes all 22 markers converge into a scrum within seconds, and the readout loses shape — the one thing it exists to communicate.',
    module: 'matchday',
    source: 'fm-03-design'
  },
  {
    id: 'matchday.boostCostGrowth',
    constant: 'boostCostGrowth',
    value: '1.6^level, five levels, base 40–75',
    rationale:
      'Sized so roughly one upgrade lands per match at normal possession, and a fully maxed line costs more than a single match can generate.',
    failureMode:
      'Cheaper, and the shop is a menu you clear on matchday one and never open again. The second purchase has to feel earned.',
    module: 'matchday',
    source: 'fm-03-design'
  },

  // -------------------------------------------------------------- stadium --
  {
    id: 'stadium.comfortCeiling',
    constant: 'attendanceFactor upper clamp',
    value: '1.2, unreachable with the current eight blocks (real max 1.1)',
    rationale:
      'With eight blocks fully upgraded, totalComfort tops out at 8 and the bonus caps at 1.1. The 1.2 ceiling is deliberate headroom for additional blocks.',
    failureMode:
      'Someone "correcting" the clamp to 1.1 to match observed behaviour would silently cap any future stadium expansion. Pinned by a test in stadium/rules.test.ts.',
    module: 'stadium',
    source: 'architecture (found during the port)'
  },

  // ---------------------------------------------------------------- league --
  {
    id: 'league.relegationPlaces',
    constant: 'relegationPlaces',
    value: '2 (the prototype used 3)',
    rationale:
      'Promotion and relegation counts must match once clubs persist between seasons, otherwise divisions drift in size. Content now enforces the invariant with a Zod refine.',
    failureMode:
      'This is a real balance change, not a port: staying up is easier than the prototype made it. The prototype hid the mismatch by rebuilding all four divisions from scratch every summer. Set both to 3 to restore its harshness — but they must stay equal.',
    module: 'league',
    source: 'subagent port — NEEDS A DESIGN DECISION'
  },
  {
    id: 'league.homeAdvantage',
    constant: 'homeAdvantage',
    value: '3, applied league-wide',
    rationale:
      'The value is ported. Applying it to every fixture rather than only the player’s is the change: the prototype gave +3 only via calcTeamStrength(true), so two AI clubs met on neutral ground.',
    failureMode:
      'With home advantage applied only to the player, their record is systematically flattering relative to the table around them, and the league table quietly means something different for them than for everyone else.',
    module: 'league',
    source: 'subagent port'
  },

  // -------------------------------------------------------------- transfer --
  {
    id: 'transfer.maxCounterRounds',
    constant: 'maxCounterRounds',
    value: '4 (no prototype equivalent)',
    rationale:
      'A cap is required, the number is a guess. Without one the counter loop is a dominant strategy: near market value the buyer accepts ~70% and walks ~10%, so countering before ever accepting is strictly better in expectation and the accept button is mathematically dead.',
    failureMode:
      'Remove the cap and the negotiation stops being a decision — there is one correct action and the player is only pressing it repeatedly. Four rounds allows two haggles from a fresh bid while keeping accept live.',
    module: 'transfer',
    source: 'subagent port — NEEDS A DESIGN DECISION'
  },
  {
    id: 'transfer.freeAgentValue',
    constant: 'ListingSchema.fee',
    value: 'price on the listing, not on the player',
    rationale:
      'The prototype set a free agent’s marketValue to 0 and stored the price separately. Signing one therefore added a permanently worthless, unsellable player to the squad.',
    failureMode:
      'A zero market value also divided by zero in the negotiation ratio, silently pinning every future offer for that player to the harshest accept band. Two bugs from one misplaced field — a price belongs to an offer, never to a person.',
    module: 'transfer',
    source: 'subagent port (bug fix)'
  },
  {
    id: 'transfer.refreshEveryMatchdays',
    constant: 'refreshEveryMatchdays',
    value: '1',
    rationale:
      'The prototype refreshed the market only on new game, so a whole career saw the same six players. A weekly refresh was specified in the port brief.',
    failureMode:
      'Too frequent and the market feels like noise with nothing worth waiting for; too rare and scouting has nothing to act on. This is a feel decision that wants play-testing, not reasoning.',
    module: 'transfer',
    source: 'architecture brief — NEEDS PLAY-TESTING'
  },

  // ------------------------------------------------------------ onboarding --
  {
    id: 'onboarding.storageVsFlow',
    constant: 'ManagerSchema.name',
    value: 'max(28), no minimum',
    rationale:
      'A schema describes what may be PERSISTED; blockers() describes what may PROCEED. The flow starts with an empty name and must remain saveable mid-way.',
    failureMode:
      'A min(1) on the stored schema made freshly created onboarding state fail its own validation, so every save silently reset the module. Caught by the save round-trip test. Encoding flow rules in storage schemas breaks resumability.',
    module: 'onboarding',
    source: 'architecture (found by the save round-trip test)'
  },
  {
    id: 'progression.unlockPacing',
    constant: 'UNLOCK_EVERY',
    value: 'one module every 3 matchdays, two at season end',
    rationale:
      'Paces discovery to roughly the rate a player can absorb a new system. A survived season opens two at once because by then they have the vocabulary for it.',
    failureMode:
      'All 31 modules at once is the most reliable way to lose someone in their first game. Too slow and the game feels thin for hours. Untested against real players — this is the number most likely to be wrong.',
    module: 'progression',
    source: 'architecture — NEEDS PLAY-TESTING'
  },

  // ------------------------------------------------------------------- ui --
  {
    id: 'design.iconEarnsItsPlace',
    constant: 'nav pictograms',
    value: 'none in the nav list; kept in the tab bar',
    rationale:
      'An icon earns its place when it is faster to recognise than its label at the size it actually appears. In a 28-item nav list at 14px every icon competes with 27 others and none disambiguates, so the word wins. In a five-item tab bar at thumb distance with an 11px label, the mark IS the affordance and the word is the fallback.',
    failureMode:
      'Reading "minimal icons" as "no icons" strips the tab bar of the only thing carrying it at thumb distance. Same rule, opposite outcomes — the rule is what travels, not the outcome.',
    module: 'design',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'design.declaredMeaningNotBreakpoints',
    constant: 'DataTable Column.role',
    value: "'primary' | 'secondary' | 'detail' — no caller names a breakpoint",
    rationale:
      'The caller declares meaning, the component decides presentation. Below 768px DataTable renders rows, not a table: primary on line one, secondary on line two, detail behind a tap.',
    failureMode:
      'The previous API was a `hideBelow: number` that no CSS matched — a documented API doing nothing, which is worse than a missing one because callers believe the problem is handled. The naive fix is worse still: hiding a header while the caller\'s cells remain misaligns the table, which in a game about reading numbers is a data-integrity failure. A nine-column squad table cannot be rescued at 375px by removing columns.',
    module: 'design',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'design.entityKeys',
    constant: 'DataTable row keys',
    value: 'keyed by entity id, never by array index',
    rationale:
      'An index key is the same as no key. Sorting reuses DOM nodes positionally, so per-row state attaches to a different row than the one it belongs to.',
    failureMode:
      'Not a rendering nit: an open menu or a focused field landing on the wrong player makes the player distrust every number on the screen, including the correct ones.',
    module: 'design',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'progression.delegationIsSilence',
    constant: 'autopilot + delegated.competence',
    value: 'an executive resolves the department AND stops its mail',
    rationale:
      'The player fantasy is not "a number goes up", it is "this inbox stops asking me things". Competence (0..1) rather than wage is the interesting stat: a mediocre executive still decides, just badly, and the player finds out at the balance sheet.',
    failureMode:
      'Delegation that only costs a wage and changes no prompts is a menu entry, not a mechanic. Delegation that resolves items perfectly removes the trade — there has to be a way to hire the wrong person.',
    module: 'progression',
    source: 'fm-03-design (Creative Director)'
  },

  {
    id: 'progression.invisibleStat',
    constant: 'executive competence',
    value: 'must resolve somewhere the player reads, not only in the balance sheet',
    rationale:
      'Competence working correctly is not the same as competence being observable. A weekly report from each delegated department carries the difference in TONE — high competence is terse ("2 Vorgänge erledigt. Keine Rückfragen."), low is deflection ("Bei 3 weiteren war die Lage schwieriger als zunächst angenommen…"). The player learns what they bought by reading it, and the parody does the teaching.',
    failureMode:
      'A stat that only resolves in aggregate financials is invisible: the player cannot attribute an outcome to a decision they made four hours ago. They pick between two numbers on a hire card and never find out whether they were right — the same "upgrade with no observable consequence" failure the whole radar layer was built to avoid.',
    module: 'progression',
    source: 'fm-03-design (found in their own feature, after specifying the rule)'
  },
  {
    id: 'progression.silencingIsNotFiltering',
    constant: 'isSilenced vs delegationFor',
    value: 'the player-facing filter and the machinery view must not be shared',
    rationale:
      'Delegation hides a department from the player. Machinery must still see it in full — an autopilot exists precisely to act on the department that has been hidden.',
    failureMode:
      'An autopilot reading a list already filtered by the player-facing predicate sees an empty list by construction, so every decision it should make becomes dead code. It fails silently: no error, no event, just an executive who appears to do nothing. Hit in the LinkedOut autopilot; now pinned by a test here.',
    module: 'progression',
    source: 'fm-03-design'
  },
  {
    id: 'onboarding.narrativeBeforeClub',
    constant: 'STEPS order',
    value: 'welcome → manager → narrative → club → confirm',
    rationale:
      'The premise text makes specific claims about the club — Aufsteiger says the side just came up from the fourth division. The narrative is the stronger constraint, so it picks first and the club list narrows to what the story can honestly be told about.',
    failureMode:
      'Club-first lets the copy contradict the crest: a fourth-division promotion story attached to a top-flight side. Filtering narratives after the fact hides it rather than preventing it, and the player can still build a start the game has to lie about. A test now requires every narrative to offer at least three clubs — one club is not a choice, and none dead-ends the flow.',
    module: 'onboarding',
    source: 'fm-03-design (question), architecture (implementation)'
  },

  {
    id: 'design.unavailableStillLeads',
    constant: 'Button blocked vs disabled',
    value: 'aria-disabled + aria-describedby + a press that routes to the unmet field',
    rationale:
      'An unavailable control must still explain and still lead somewhere. Disabling is not an explanation. Three parts: aria-disabled keeps it in the tab order; aria-describedby associates the reasons rather than merely placing them nearby; and a blocked press moves focus to the first unmet field, which turns the blocker from a notice into a route.',
    failureMode:
      'The `disabled` attribute drops the control out of the tab order, so a keyboard user reaches the end of the step and finds nothing — no button, no explanation, no way to discover what is missing. Visual adjacency is a sighted-only relationship: without the association a screen reader announces "Weiter, dimmed" and stops.',
    module: 'design',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'design.parodyTargetsInstitutions',
    constant: 'club voice',
    value: 'the club is not a joke',
    rationale:
      'The parody lives in the brands, the mail and LinkedOut — things done TO the player. The club is what they are asked to care about for twenty seasons, so each flavour line carries one specific true-sounding detail instead of a punchline. "Bei Sturmflut fällt das Training aus. Das steht so in der Satzung." is funny the way a real club minute is funny.',
    failureMode:
      'Parody aimed at the thing the player is meant to be attached to corrodes the attachment the rest of the game depends on. The rule: parody targets institutions, never the player\'s own attachment.',
    module: 'design',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'progression.recommendedIsAFlag',
    constant: 'Narrative.recommended',
    value: 'a semantic flag, never "the first element"',
    rationale:
      'Array position is not a contract. A flag can be tested; a position cannot.',
    failureMode:
      'Someone reorders the list for a layout reason six weeks from now and the recommended start moves silently with nothing failing. A test asserts exactly one narrative carries the flag and that a reversed array still resolves to the same one.',
    module: 'progression',
    source: 'fm-03-design (Creative Director)'
  },

  // ------------------------------------------------------------- matchday --
  {
    id: 'matchday.lineupMustReachTheSim',
    constant: 'squad.strength published in `pre`',
    value: 'pre/10, consumed by league in `sim`',
    rationale:
      'league resolves our fixture in `sim` and needs to know how strong we actually are. Publishing the eleven\'s strength before the match is the only ordering that works.',
    failureMode:
      'It shipped the other way round: squad published in `post`, AFTER the match had been played, so league silently took its fallback and the player\'s team selection had no effect on their own results at all. Nothing errored. Proven by a test that fielded a 95-rated eleven and a 25-rated one on the same seed and got the identical scoreline. The registry now refuses to boot on a consumer-before-provider pair.',
    module: 'matchday',
    source: 'architecture (found while scoping the module)'
  },
  {
    id: 'matchday.styleIsPaidLater',
    constant: 'style.fitnessCost',
    value: 'offensiv 1.25, ausgeglichen 1.0, defensiv 0.85',
    rationale:
      'The price of a style is fitness, not in-match risk, so the decision is felt the FOLLOWING week. That makes rotation a consequence of a choice rather than a chore.',
    failureMode:
      'The multiplier was documented and computed but never wired — squad hardcoded 1. Attacking football was free, which is the same invisible-stat failure as an executive whose competence resolves nowhere. Now provided by matchday and consumed by squad, with the ordering enforced at boot.',
    module: 'matchday',
    source: 'architecture'
  },
  {
    id: 'matchday.styleTradesMeanForVariance',
    constant: 'style.goalChance',
    value: 'offensiv 1.35, ausgeglichen 1.0, defensiv 0.75 — applied to BOTH sides',
    rationale:
      'Openness moves variance, not expectation. Offensiv is correct when a draw is worthless — chasing promotion in May, behind in a cup tie — and wrong when a point is worth having. That is a decision rather than a calculation.',
    failureMode:
      'Strength alone put both styles on ONE axis, points per season, and on one axis one option must dominate: measured at defensiv 22.3 vs offensiv 16.8, offensiv was strictly worse and nobody would ever pick it. Raising its strength or cutting its cost only moves which one dominates; tuning them equal makes the choice meaningless instead of wrong. The fix had to change what the option DOES, not what it is worth.',
    module: 'matchday',
    source: 'fm-03-design (Creative Director) — rejected both levers offered'
  },
  {
    id: 'squad.fitnessIsADeviation',
    constant: 'fitnessWeight + fitnessBaseline',
    value: '0.35 around a baseline of 70; recovery raised 15 → 21',
    rationale:
      'A squad at the baseline rates at face value and meets the league on equal terms. Keeping it fresher is a genuine edge; letting it collapse is a genuine penalty.',
    failureMode:
      'The original `strength * fitness/100` taxed the player and nobody else, because AI clubs carry a static strength and never tire. MEASURED: the eleven read 23 points below its own league, and a squad at exactly the table strength finished 15th of 18 — so transfers, youth, training and scouting were all decoration, since none of them could move a result. After the fix: +10 finishes top three in 21 of 24 seasons, level finishes 9.7th of 18, -10 averages 16th. Pinned by a balance canary in CI.',
    module: 'squad',
    source: 'architecture (measured), target set by fm-03-design'
  },
  {
    id: 'league.threeUpThreeDown',
    constant: 'promotionPlaces / relegationPlaces',
    value: '3 and 3 — RESOLVED, was 2 and 2',
    rationale:
      'Not a balance number, a tutorial requirement. Aufsteiger is the default start and its premise is survival — "Halte die Klasse. Danach reden wir weiter." Every improvement system in the game is ultimately justified by "or else you go down", so that has to bite. Three also matches German lower-league practice, and the player starts in the lower leagues.',
    failureMode:
      'At two down the clearly-worst side survived more than half the time, so the tutorial spent a season teaching that its own stated threat was theatre. MEASURED at three-down across four seed families of 40 seasons: a side ten points below is relegated 68-80% of the time, while a side at the league average goes down 5-18% — at or below the 3-of-18 base rate. Both halves matter: being clearly worst must be usually fatal, being ordinary must not be risky. The symmetry invariant was never the problem and is untouched — it was right and the content was wrong.',
    module: 'league',
    source: 'fm-03-design (ruling), architecture (measured)'
  },

  {
    id: 'design.sharedSelectorReach',
    constant: 'component class prefixes',
    value: 'card classes are prefixed; never reuse a name the shell already owns',
    rationale:
      'A club card styled with `.club-name` reformatted the header, which had used that class since the original file — and `querySelector(\'.club-name\')` could return a card instead of the header.',
    failureMode:
      'Svelte scoped styles make this WORSE, not better: they would have prevented the visual half, so the CSS would look correct while a query still crossed the boundary — the same bug with its most visible symptom removed. Scoping protects rendering, not lookup.',
    module: 'design',
    source: 'fm-03-design'
  },
  {
    id: 'onboarding.marksNotNumbers',
    constant: 'unlockedAtStart presentation',
    value: 'filled/unfilled marks, count as caption — never a bare number',
    rationale:
      'A number invites ranking: 4 is less than 8, therefore worse. Marks read as a CUT. That is what stops four of five starting narratives looking like consolation prizes beside the recommended one.',
    failureMode:
      'Showing the figure raw makes every start except the most permissive read as a deficiency, so the narrative choice collapses into a difficulty slider — which is exactly what narratives exist not to be.',
    module: 'onboarding',
    source: 'fm-03-design (Creative Director)'
  },
  {
    id: 'league.flakyBandsErodeSocially',
    constant: 'balance canary sample size',
    value: '20 seasons, bands set from a 4-family measurement before the first red run',
    rationale:
      'The sample has to be large enough that the bands can stay honest.',
    failureMode:
      'The erosion is social, not technical: nobody widens a band in bad faith. They widen it because the build is fine and the test is annoying, and each individual widening is defensible. The end state asserts nothing. So the sample size has to be decided BEFORE the first red run, not after — once you are staring at a failure on a good build, every argument points one way.',
    module: 'league',
    source: 'fm-03-design (the mechanism), architecture (the rule)'
  },

  {
    id: 'design.fillIsNotInk',
    constant: 'color: var(--role) — now a build failure',
    value: 'fills go on `background`, ink goes on `color`; the pairs are read from tokens.css',
    rationale:
      'A domain colour is two tokens. A saturated green reads both ways on a dark ground and neither way on parchment, so the value that fills a field and the value that sets type on the page cannot be the same one.',
    failureMode:
      'It recurred three times, each time in code written by someone who knew the rule — including a sweep of lib/ that missed the shell. It survives because `var(--primary)` is the obvious name to reach for and nothing objects. Now mechanical: the gate discovers every role with an `-ink` companion from the token file, so adding a domain colour puts it under the rule automatically. Found 14 live instances across 12 files on its first run.',
    module: 'design',
    source: 'fm-03-design (proposed the rule), architecture (built it)'
  },
  {
    id: 'design.claimsAboutStateMustBeGenerated',
    constant: 'anything asserting the contents of a file',
    value: 'generate it from the file, never type it',
    rationale:
      'Three of our worst mistakes were the same shape: a commit message describing work not in its diff, a test whose name no longer matched what it tested, and a message claiming a documentation edit that was never made. In each case the artifact said one thing and contained another, and nothing in the tooling objected.',
    failureMode:
      'The root is a claim about state made at the moment of INTENDING it rather than after observing it — the same error as verifying from a screenshot, one level up: what gets confirmed is your own intention, not the artifact. Narrow but real defence: `git show --stat` before describing a commit, re-read a file before describing its contents.',
    module: 'design',
    source: 'fm-03-design and architecture (three instances between us)'
  },

  {
    id: 'design.statusIsNotDomain',
    constant: '--pos-ink / --neg-ink',
    value: 'status has its own pair, separate from every domain colour',
    rationale:
      'Finance-the-department being green is an IDENTITY. Money going up is a STATUS. They are different kinds of fact and had been sharing tokens, so a correct change to the domain ink dragged the status along with it.',
    failureMode:
      'MEASURED: after the fill/ink sweep, dark mode had positive and negative sitting 23 degrees apart in hue — cream against near-white. Light mode was fine at 129 degrees, so the loss existed in one theme only and only if you measured it. The redundancy principle underneath: WCAG 1.4.1 forbids colour as the ONLY channel, not colour. Red/green is exactly the pair that collapses under deuteranopia, which is why the glyph is load-bearing and must stay — but removing hue as a REDUNDANT channel buys no accessibility for anyone and costs every player who can use it a fast read. Belt and braces, not braces instead of belt.',
    module: 'design',
    source: 'fm-03-design (measured, and overruled architecture\'s call to leave it)'
  },

  // ---------------------------------------------------------------- staff --
  {
    id: 'staff.effectsAreDeclarative',
    constant: 'StaffRole.effects',
    value: 'a key and a value, contributed to a shared bus — never a direct call',
    rationale:
      'A role declares `{ key, factor }` or `{ key, add }`. Nothing in staff knows what any key means, and no other system asks whether a particular person is employed — squad asks how much fitness is lost this week, not whether there is a fitness coach. Adding a role is a content edit; removing one cannot strand a check elsewhere.',
    failureMode:
      'The alternative — `if (staff.physio.hired)` scattered through other modules — is how the prototype worked, and it means every new role requires edits in systems whose authors never heard of it. A test asserts no effect resolves to a factor of 1 or an add of 0, because an effect that changes nothing is the invisible-stat failure written directly into content.',
    module: 'staff',
    source: 'architecture, after the prototype\'s fx/dx design'
  },
  {
    id: 'staff.provideIsNotContribute',
    constant: 'Hook.provides vs Hook.contributes',
    value: 'declared separately, because the arity differs',
    rationale:
      'A PROVIDED key has one producer and many readers. A CONTRIBUTED key has many contributors and readers that see the accumulated value. They are different mechanisms and cannot share a declaration or a key name.',
    failureMode:
      'They did share both, briefly, and it produced the invisible-stat failure a FIFTH time — in the very bus built to prevent it. staff declared `provides: [squad.strength]` while calling `addTo`; matchday `provide`d the same name; the co-trainer\'s +2 landed in a bucket nobody read. Caught only because the effect test hired a co-trainer and asserted the table moved. The registry now requires every reader to run after ALL contributors, not just one — a reader between two contributors silently sees half a value, which is worse than seeing none because it looks plausible.',
    module: 'staff',
    source: 'architecture (found by its own effect test)'
  },

  {
    id: 'design.diskMustMatchRegistry',
    constant: 'wiring.test.ts',
    value: 'a feature on disk must be wired into the live registry',
    rationale:
      'A Screen.svelte that exists must be registered as a screen; a docs.ts that exists must reach the live doc lookup — not merely be non-empty, but actually resolve, because that is what a tooltip reads. Generated from the filesystem and checked against the real registry, never from a list someone maintains: a list needs the same discipline that failed.',
    failureMode:
      'verify went green with a finished screen unreachable and finished tooltips uninstalled. The docs gate scans docs.ts files STATICALLY so the entries counted, while the route resolves `mod.screen?.()` and `docs: {}` meant installDocs never saw them — so the gate certified UI that did not ship and tooltips that resolved to nothing. Verified by reproducing the gap: the docs gate still prints a green tick while this test fails on both counts.',
    module: 'design',
    source: 'fm-03-design (found it by opening the route instead of trusting the green)'
  },

  // --------------------------------------------------------------- editor --
  {
    id: 'editor.overridesNeverReplace',
    constant: 'EditorState.clubs / .players',
    value: 'shipped content stays; edits sit on top and resolve at read time',
    rationale:
      'The magic of the old managers was never the fake names — it was that you could go in and fix them. Rename the hocus-pocus clubs to what they are actually called, drop in a real crest, rename the squad, build one player with 99 in everything. The game shipped safe and the player made it theirs.',
    failureMode:
      'Editing the shipped data in place would make "reset" a restore-from-backup, which can fail and eventually will. As an override layer, reset is deleting a key — it cannot fail, because the original was never written over. It also means we ship no real names, crests or people at any point: the player supplies those, which is the answer to the licensing question rather than a workaround for it.',
    module: 'editor',
    source: 'Eric (the feature), architecture (the shape)'
  },
  {
    id: 'editor.packsImportPartially',
    constant: 'applyPack',
    value: 'validate entry by entry, never all-or-nothing',
    rationale:
      'A pack with one malformed club imports the other thirteen and names the one it skipped.',
    failureMode:
      'Refusing an entire file over a single typo is how a sharing feature stops being used. Crest images are deliberately not inlined for the same reason — a pack with a dozen base64 PNGs is megabytes and cannot be pasted into a message.',
    module: 'editor',
    source: 'architecture'
  },
  {
    id: 'squad.fiveAttributes',
    constant: 'Player.attributes',
    value: 'Technik, Tempo, Kraft, Übersicht, Mentalität — strength derived, not stored',
    rationale:
      'An editor over a single number is a slider. Five categories give the player something to shape, and make a 99-everywhere ringer feel absurd in the way it is supposed to. The same five numbers mean different things per position — a keeper lives on Mentalität and Übersicht, a striker on Technik and Tempo — which is what stops them collapsing back into one number wearing a hat.',
    failureMode:
      'Position weights must each sum to 1, checked in a test: a column summing to 0.9 would quietly rate every player in that position 10 percent low, and nothing else would object. Generation shifts a spread into the requested band rather than clamping the overall, because the transfer market picks by league level and a striker drifting above the band would put a top-flight player in a fourth-division shop window.',
    module: 'squad',
    source: 'Eric (the requirement), architecture (the model)'
  },

  {
    id: 'editor.discoverDoNotWire',
    constant: 'discover.ts',
    value: 'screens and docs found on disk; only the module LIST stays explicit',
    rationale:
      'A check that keeps catching the same omission is telling you the omission should not be possible. The wiring test caught two people forgetting the same two lines, which proved the information was derivable all along.',
    failureMode:
      'The module list is deliberately NOT discovered. It is the one place you can read the whole game, and an explicit line is what makes deleting a feature a two-step operation rather than an archaeology exercise. Only the plumbing — the part with no decision in it — is inferred. Docs are recognised by SHAPE rather than by a naming convention, because a convention is another thing to remember and removing things to remember is the point; the wiring test still asserts every docs.ts contributed, so a drifted shape fails loudly instead of going quiet.',
    module: 'editor',
    source: 'fm-03-design (proposed), architecture (built)'
  },
  {
    id: 'editor.crestDownscaleNeverReject',
    constant: 'putCrest',
    value: 'downscale to 512px on write; a missing asset returns null, not an error',
    rationale:
      'Someone picking a 4 MB photo from their camera roll gets a working crest. Cleared site data degrades to the generated mark. Object URLs are managed by the store, so callers get a stable string and never have to remember to revoke anything. One club, one crest — replace, never accumulate.',
    failureMode:
      'The failure mode of "your file is too big" is that the player gives up, and an upload they gave up on is a feature they never used. Rejecting is the obvious implementation and the wrong one. Likewise a missing asset must be a normal outcome rather than an error: a save imported from someone else\'s pack references crests this device has never seen, and that must show the shipped mark rather than a broken image.',
    module: 'editor',
    source: 'fm-03-design (all four constraints)'
  },

  // --------------------------------------------------------------- league --
  {
    id: 'league.clubsHaveIds',
    constant: 'LeagueTeam.id, LeagueState.playerClubId',
    value: 'generated from the seeded RNG, never derived from the name',
    rationale:
      'An identity has to survive being renamed, or it was never an identity. Ids come from the seeded stream so the same seed yields the same ids and an edit survives restarting a career; designed clubs carry fixed ids and are portable across worlds, while generated ones are necessarily seed-local because "the club in slot 7" means nothing in someone else\'s game.',
    failureMode:
      'Twelve lookups compared names against a constant. Renaming your own club — the first thing anyone does in an editor — would have stopped the game resolving your own fixture, silently, and the symptom would have been the squad ceasing to matter. A name-derived id has the same defect one layer up: an edit pack keyed on names applies to whichever club happens to be called that in the recipient\'s world.',
    module: 'league',
    source: 'fm-03-design (the constraint), architecture (found the twelve)'
  },
  {
    id: 'league.generatedClubsStayPlain',
    constant: 'designed clubs as a minority',
    value: 'roughly a third crafted, the rest deliberately forgettable',
    rationale:
      'A club called "Dynamo Regensburg" with no crest and no story is a BLANK SLATE THAT INVITES REPLACEMENT, which is exactly what shipping an editor is for. A handful of crafted clubs give the division texture; the rest stay plain so the pencil feels welcome.',
    failureMode:
      'Crafted identity works slightly against the editor\'s purpose — nobody wants to overwrite a club they have grown fond of. So do not make the generated names charming: plausible and plain is the target, and a flavour line on a generated club stops it being a placeholder. Equally, none at all and the division has no character to anchor it.',
    module: 'league',
    source: 'fm-03-design (Creative Director) — corrected architecture\'s framing'
  },
  {
    id: 'onboarding.adoptTheChosenClub',
    constant: 'startCareer / adoptClub',
    value: 'the club picked at career start becomes the club in the league',
    rationale:
      'One place where the start of a career is defined, so a surface can call it without knowing which modules must be told.',
    failureMode:
      'The choice used to reach a confirm screen and stop. You picked SC Ziegelhütte, got a toast welcoming you to it, and played the whole game as a hardcoded FC Anstoß Pro — the carousel, the crests and the flavour lines were decoration on a decision the game never read. Eighth instance of the same shape, found while fixing the seventh, in the same feature.',
    module: 'onboarding',
    source: 'architecture'
  },

  {
    id: 'design.runtimeTokenNamesDefeatChecks',
    constant: 'var(--{expr})',
    value: 'flagged; pass the resolved token instead',
    rationale:
      'A token name composed at runtime cannot be checked for the fill/ink split, or for existing at all. An explicit map from prop to literal token is checkable; the indirection is not.',
    failureMode:
      'Panel built `var(--{accent})` from a prop and painted its title with it, so EVERY panel heading in the game was a fill used as type — 2.81:1 for accent and 3.63:1 for primary on the light card. The fill/ink rule was already in place and could not see it, because there was no literal token name to find. A gate is only as good as the indirection it can see through.',
    module: 'design',
    source: 'fm-03-design (found it and named the blind spot)'
  },
  {
    id: 'design.undefinedTokensAreSilent',
    constant: 'var(--x) with no definition',
    value: 'flagged; a fallback or a local definition is fine',
    rationale:
      'CSS drops an undefined custom property without complaint — no error, no warning, nothing in the build.',
    failureMode:
      'Retiring the spacing aliases left eight uses of --sp-1..4 resolving to nothing, and the gaps were simply zero. The same silent shape as everything else, in a new medium: the value existed, then stopped existing, and nothing said so. Definitions are collected from the whole tree rather than tokens.css alone, because a component may legitimately declare its own.',
    module: 'design',
    source: 'fm-03-design (proposed), architecture (built)'
  },

  {
    id: 'league.identityIsNotAName',
    constant: 'playerClubName — deleted, not deprecated',
    value: 'the content constant is gone; only league.playerClubId remains',
    rationale:
      'While a constant called playerClubName existed it read like the obvious way to ask which club is ours, so people reached for it — including in files a sweep of rules and engine never touched. Deleting it makes the wrong answer UNAVAILABLE rather than discouraged, which is the same argument as a discovered registry beating a remembered one. rankOf(name) went with it, superseded by rankOfId and dead in production.',
    failureMode:
      'Thirteen instances of this class. The last one had three surfaces giving three different answers to "which club am I": the table said 15th on 2 points, the chips directly above it said "Platz —, Punkte 0", and the header said something else again. Every line was individually correct — they were asking different questions. A hardcoded name literal is now a build failure, since that is the only route left.',
    module: 'league',
    source: 'fm-03-design (found it by playing; proposed the deletion)'
  },
  {
    id: 'design.playTheGame',
    constant: 'how these were found',
    value: 'nine of nine by running it; none by reading it',
    rationale:
      'Eight were found by running a feature, one by opening a route, and the last by playing three matchdays and looking at a number. Not one was found by inspection or by audit.',
    failureMode:
      'The reason is structural rather than a matter of diligence: connectedness is not visible in either half on its own. A screen can be correct and a rule can be correct while the screen asks a different question than the rule answers — and reading either file shows nothing wrong. Worse than being connected to nothing is being connected to the wrong thing, because it looks connected.',
    module: 'design',
    source: 'fm-03-design'
  },

  // ---------------------------------------------------------------- design --
  {
    id: 'design.twoTokensPerDomain',
    constant: '--c-<name> and --c-<name>-ink',
    value: 'every domain is a fill token and a text token, never one colour',
    rationale:
      'A colour asked to both glow as a field and stay legible as type is being asked two contradictory things, and one value cannot serve both.',
    failureMode:
      'A single token per domain forces fills and text to share a value, and the mid-tones then fail both. Audited: stocks and transfer clear 4.5:1 with neither black nor white, so label colour must be computed per fill rather than set globally.',
    module: 'design',
    source: 'fm-03-design (contrast audit)'
  },
  {
    id: 'design.auditTheBoard',
    constant: 'live #00CC6A, tertiary text, secondary text, underworld light',
    value: 'four board values failed WCAG and were corrected in implementation',
    rationale:
      'Live signal was 1.90:1 on parchment despite being captioned as an accessibility fix — it survives as a fill at 7.18:1 with dark text but cannot be type, so --live-ink #007F42 was added at 4.54:1. Tertiary text cleared no floor in either mode. Secondary sat at 4.36:1, just under AA. Underworld had no legible ink value at all.',
    failureMode:
      'A design board is a proposal, not a spec. Shipping its values unmeasured produces a palette that is coherent on the board and unreadable on the device — and an accessibility caption on a failing value is worse than none, because it stops anyone checking.',
    module: 'design',
    source: 'fm-03-design (contrast audit)'
  },
  {
    id: 'design.modeScopedValues',
    constant: '--c-live',
    value: '#00FF7F in dark, #00A85A in light',
    rationale:
      'Tokens carry meaning; modes carry values. The phosphor green that reads as "live" on a dark ground is unreadable on paper tones, so the light palette keeps the role and changes the value.',
    failureMode:
      'Deriving a light palette by dimming the dark one produces tokens that are consistent in code and wrong on screen. A role must be free to resolve to an unrelated value per mode.',
    module: 'design',
    source: 'fm-03-design'
  }
] as const);

export type DesignIntentId = (typeof designIntent)[number]['id'];

export function intentFor(id: string): DesignIntent | undefined {
  return designIntent.find((d) => d.id === id);
}

export function intentByModule(module: string): DesignIntent[] {
  return designIntent.filter((d) => d.module === module);
}
