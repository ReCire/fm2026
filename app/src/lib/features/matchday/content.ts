import { z } from 'zod';


/**
 * Tactical modifiers.
 *
 * Deliberately small — Eric asked to keep the simulation simple for now, so
 * these nudge the strength that league already uses rather than introducing a
 * second model. Every value is a flat addition to team strength, which keeps
 * them comparable to each other and to the squad ratings they sit beside.
 */
const FormationEntry = z.object({
  /** Applied when we are the home side. */
  home: z.number(),
  away: z.number(),
  label: z.string()
});
const StyleEntry = z.object({
  strength: z.number(),
  /** Multiplies the fitness a starter loses. Attacking football is tiring. */
  fitnessCost: z.number().min(0.5).max(2),
  label: z.string()
});
const TalkEntry = z.object({
  strength: z.number(),
  /** Morale delta applied to the eleven after the match. */
  morale: z.number(),
  label: z.string()
});

/*
 * Written out key by key rather than as z.record(z.enum(...)).
 *
 * A record of an enum types every lookup as possibly-undefined, so every call
 * site needs a non-null assertion — and an assertion is exactly how a genuinely
 * missing entry would slip through. Spelling the keys out means adding a
 * formation without its modifiers is a compile error, which is what we want.
 */
export const MatchdayContentSchema = z.object({
  formation: z.object({
    '4-4-2': FormationEntry, '4-3-3': FormationEntry,
    '5-3-2': FormationEntry, '3-5-2': FormationEntry
  }),
  style: z.object({
    defensiv: StyleEntry, ausgeglichen: StyleEntry, offensiv: StyleEntry
  }),
  talk: z.object({
    ruhig: TalkEntry, motivierend: TalkEntry, fordernd: TalkEntry
  })
});
export type MatchdayContent = z.infer<typeof MatchdayContentSchema>;

export const matchdayContent: MatchdayContent = MatchdayContentSchema.parse({
  formation: {
    '4-4-2': { home: 0, away: 0,  label: 'Ausgewogen. Keine Schwäche, keine Spitze.' },
    '4-3-3': { home: 2, away: -1, label: 'Breit und hoch. Zu Hause stark, auswärts offen.' },
    '5-3-2': { home: -1, away: 2, label: 'Tief und kompakt. Auswärts belastbar.' },
    '3-5-2': { home: 1, away: 0,  label: 'Das Mittelfeld überladen, die Kette ausgedünnt.' }
  },
  style: {
    defensiv:      { strength: -1, fitnessCost: 0.85, label: 'Weniger Risiko, weniger Ertrag.' },
    ausgeglichen:  { strength: 0,  fitnessCost: 1,    label: 'Kein Vorteil, kein Preis.' },
    offensiv:      { strength: 2,  fitnessCost: 1.25, label: 'Mehr Zugriff, teurer bezahlt.' }
  },
  talk: {
    ruhig:        { strength: 0, morale: 0,  label: 'Nichts gesagt, nichts verdorben.' },
    motivierend:  { strength: 1, morale: 2,  label: 'Hebt die Stimmung, ein wenig.' },
    fordernd:     { strength: 2, morale: -3, label: 'Wirkt heute. Kostet nächste Woche.' }
  }
});
