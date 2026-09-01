import { defineModule } from '$lib/engine/module';
import { PressSchema, createPress, PRESS_VERSION, type Story } from './state';
import {
  causesFor, clampPressure, decayOf, fill, fineFor, pickHeadline, publish,
  raidChance, recordResult, shouldOpenFile, statusOf, RAID_RESOLVES,
  type MatchResult
} from './rules';
import {
  INVESTIGATION_FROM, pressContent, bandFor, suspicionCandidates
} from './content';

/**
 * How much faster a club with the right friends is forgotten.
 *
 * Doubling rather than a small nudge, because `pressureDecay` is bought by a
 * single tier-1 node in Schattenkabinett and it is the ONLY thing in the tree
 * that changes the shape of the meter rather than its level. A 10% nudge would
 * be indistinguishable from noise across a season, which is how a node ends up
 * technically working and practically inert.
 */
const FORGETS_FASTER = 2;
import { formatMoney } from '../finance/rules';
import { postToLedger } from '../finance/module';
import { brands } from '$lib/content/brands';

/**
 * Ermittlungsdruck — the bill for the dirty half of the doctrine tree.
 *
 * Thirteen nodes touch `pressureMod` and nine of them RAISE it. This is what
 * made those nodes purchasable, and it is the only thing in the game that
 * charges for the Schattenkabinett after the Wissenspunkte are spent.
 */

/** Who ran the story. Bigger league, bigger name — see content/brands.ts. */
function outletFor(rng: { pick<T>(xs: readonly T[]): T }, leagueLevel: number): string {
  const media = brands.media;
  /*
   * Level 0 is the top. A fourth-division scandal makes the local paper and a
   * Bundesliga one makes the national, which is the same joke the sponsors use
   * and the reason both draw from one list: the outlet that covers your
   * relegation should be the outlet that covered your promotion.
   */
  const wanted = leagueLevel <= 0 ? 3 : leagueLevel === 1 ? 2 : 1;
  const pool = media.filter((b) => b.tier <= wanted);
  return rng.pick(pool.length > 0 ? pool : media).name;
}

export default defineModule({
  id: 'press',
  title: 'Presse',
  summary:
    'Ermittlungsdruck: was geschrieben wird, was der Verband daraus macht, und was es kostet.',
  nav: { group: 'Verein', icon: '🎙️', order: 60 },
  requires: ['finance', 'league'],

  state: { schema: PressSchema, create: createPress, version: PRESS_VERSION },

  /*
   * Only once a file is open. A needle at 12% is not something the player has
   * to do anything about, and a badge over a screen with no decision on it is
   * how a player learns to stop trusting badges — see sponsors/module.ts, same
   * rule, same reason.
   */
  attention: (state) => {
    const press = state.modules.press;
    if (!press.investigation) return [];
    return [
      {
        id: 'press.investigation',
        urgency: press.pressure >= 70 ? ('now' as const) : ('soon' as const),
        label:
          press.pressure >= 70
            ? `Ermittlungsdruck ${Math.round(press.pressure)} % — eine Razzia ist keine Frage des Ob mehr`
            : `Beim Verband liegt eine Akte über den Verein (${Math.round(press.pressure)} %)`
      }
    ];
  },

  hooks: {
    matchday: {
      phase: 'post',
      /*
       * After league publishes the result in `sim`, before the economy closes
       * the books at `economy`/100 — a fine posted here is on the same
       * matchday's balance sheet, where the player will go looking for it.
       */
      order: 20,
      consumes: [
        'league.result', 'league.level', 'league.clubName',
        'press.suspicion', 'press.penalty',
        'noPenalties', 'pressureDecay'
      ],
      provides: ['press.pressure', 'press.investigation'],
      run({ state, rng, emit, query, total, factor, provide }) {
        const press = state.modules.press;
        const { season, matchday } = state.meta;
        const club = query<string>('league.clubName', 'Dein Verein');
        const level = query<number>('league.level', 3);
        const immune = query<boolean>('noPenalties', false);
        /*
         * A FLAG, not a factor, and read by its own bare name.
         *
         * It was briefly a `press.decay` modifier key, and the registry
         * refused to boot: nothing contributes to it, because `pressureDecay`
         * is idempotent — two nodes that both make the story go away faster
         * make it go away faster once. Declaring a modifier key for it would
         * have compiled, run, and silently multiplied by 1 forever.
         */
        const forgetsFaster = query<boolean>('pressureDecay', false);

        /* ── 1. What the doctrine did this matchday ─────────────────────── */
        const suspicion = total('press.suspicion', 0);

        /*
         * Decay first, and ONLY decay. The suspicion arrives below, as the
         * weight of the story it produces.
         *
         * It used to be added here as well, and a test caught what that cost:
         * a sabotage advertising "+18 Ermittlungsdruck" moved the needle 25,
         * because the headline it triggered carried its own weight on top. The
         * player was shown one number and charged another, which is the exact
         * thing the printed board target exists to prevent, pointed the other
         * way.
         *
         * One movement, one headline, one number. It also keeps the promise
         * the feed was built on — every point of pressure has a line
         * underneath it saying where it came from — which the old version
         * broke silently for the largest movements in the game.
         */
        press.pressure = clampPressure(
          press.pressure - decayOf(press.pressure) * (forgetsFaster ? FORGETS_FASTER : 1)
        );

        /* ── 2. What was written ────────────────────────────────────────── */
        const result = query<MatchResult | undefined>('league.result', undefined);
        if (result) recordResult(press, result);

        const causes = suspicion > 0 ? (['suspicion'] as const) : causesFor(press, result);
        for (const cause of causes) {
          /*
           * Suspicion is drawn by MAGNITUDE, everything else at random.
           *
           * An eighteen-point sabotage should read as a Parkhaus and an
           * envelope; a three-point node should read as consultancy fees with
           * gaps in them. A flat draw made the loudest purchase in the game
           * announce itself as a filing query two thirds of the time — which is
           * not wrong in any way a test could state, and is the difference
           * between a feed you read and a feed you scroll past.
           *
           * The candidates come from content and the draw stays here, because
           * the seed lives here. Same split as `pickHeadline`.
           */
          const headline =
            cause === 'suspicion'
              ? rng.pick(suspicionCandidates(suspicion))
              : pickHeadline(rng, cause);
          if (!headline) continue;
          publish(press, {
            season,
            matchday,
            outlet: outletFor(rng, level),
            text: fill(headline.text, {
              club,
              opponent: result?.opponent ?? club,
              n: Math.max(result?.goalsAgainst ?? 0, press.unbeaten, 1)
            }),
            cause,
            /*
             * A suspicion story weighs what was actually done, not what the
             * content guessed it might weigh. The headline is the REPORT of a
             * doctrine node or a sabotage, so its weight has to be the thing
             * being reported — otherwise the tree's "+3 Ermittlungsdruck" and
             * the needle disagree, and the feed's whole promise goes with it.
             *
             * `severity` in content now carries how LOUD a sentence is, which
             * is what `weight` was being asked to mean here as well. One field,
             * one question: weight is what happened to the meter, severity is
             * how it was phrased. Every other cause keeps its own weight,
             * because nothing else is reporting a number the player was
             * already quoted.
             */
            weight: cause === 'suspicion' ? Math.round(suspicion) : headline.weight
          });
        }

        /* ── 3. What the Verband made of it ─────────────────────────────── */
        const wantsFile = shouldOpenFile(press.pressure, immune);

        if (wantsFile && !press.investigation) {
          press.investigation = { openedSeason: season, openedMatchday: matchday, raids: 0 };
          emit({
            source: 'press',
            severity: 'bad',
            title: 'Der Verband hat eine Akte angelegt',
            detail: `Ermittlungsdruck ${Math.round(press.pressure)} %. Ab hier wird an jedem Spieltag geprüft.`,
            goto: 'press'
          });
        }

        if (press.investigation && !wantsFile) {
          /*
           * The only way down that is not time. `cleared` carries −12 or −14,
           * which drops the needle well clear of the threshold rather than
           * leaving it hovering — otherwise a club oscillates across 25% and
           * opens a fresh file every other matchday, and an event that fires
           * constantly is an event nobody reads.
           */
          press.investigation = null;
          const cleared = pickHeadline(rng, 'cleared');
          if (cleared) {
            publish(press, {
              season, matchday,
              outlet: outletFor(rng, level),
              text: fill(cleared.text, { club }),
              cause: 'cleared',
              weight: cleared.weight
            });
          }
          emit({
            source: 'press',
            severity: 'good',
            title: 'Verfahren eingestellt',
            detail: 'Der Verband hat die Akte geschlossen.',
            goto: 'press'
          });
        }

        if (press.investigation && rng.chance(raidChance(press.pressure))) {
          const fine = Math.min(
            state.modules.finance.money,
            fineFor(press.pressure, factor('press.penalty', 1))
          );
          press.investigation.raids += 1;
          press.finesPaid += fine;

          const raid = pickHeadline(rng, 'raid');
          if (raid) {
            publish(press, {
              season, matchday,
              outlet: outletFor(rng, level),
              text: fill(raid.text, { club }),
              cause: 'raid',
              weight: raid.weight
            });
          }

          if (fine > 0) {
            postToLedger(state.modules.finance, {
              season, matchday,
              source: 'press',
              reason: 'Geldstrafe des Verbands',
              amount: -fine
            });
            const notice = pickHeadline(rng, 'fine');
            if (notice) {
              publish(press, {
                season, matchday,
                outlet: outletFor(rng, level),
                text: fill(notice.text, { club, sum: formatMoney(fine) }),
                cause: 'fine',
                weight: notice.weight
              });
            }
          }

          /*
           * After the headlines, never before. The feed shows the full weight
           * of what ran — which is what the boardroom reads — and the meter
           * shows what the Verband has left to be curious about, which is less
           * than it was. Applying the resolution first would net the two
           * against each other and lose both halves.
           */
          press.pressure = clampPressure(press.pressure - RAID_RESOLVES);

          emit({
            source: 'press',
            severity: 'bad',
            title: 'Razzia in der Geschäftsstelle',
            detail:
              fine > 0
                ? `${formatMoney(fine)} Strafe. Und die Bilder laufen heute Abend.`
                : 'Es war nichts zu holen. Die Bilder laufen trotzdem.',
            goto: 'press'
          });
        }

        /* ── 4. What the boardroom reads ────────────────────────────────── */
        provide('press.pressure', press.pressure);
        provide('press.investigation', press.investigation !== null);
      }
    }
  }
});

export { statusOf, bandFor, INVESTIGATION_FROM, pressContent };
export type { Story };
