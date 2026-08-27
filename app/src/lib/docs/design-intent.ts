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
