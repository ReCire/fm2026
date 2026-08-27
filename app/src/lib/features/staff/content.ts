import { z } from 'zod';

/**
 * The backroom.
 *
 * Every role's effect is DECLARATIVE: a context key and a value, contributed to
 * the shared modifier bus. No member of staff reaches into another system, and
 * no other system checks whether a particular person is employed — squad asks
 * "how much fitness is lost this week", not "do we have a fitness coach".
 *
 * That is the same shape as the prototype's `fx`/`dx()` design, which is the
 * best thing in it: adding a role is a content edit, and deleting one cannot
 * strand a check somewhere else.
 */
export const EffectSchema = z.object({
  key: z.string(),
  /** Multiplied into the shared value. Use for costs and risks. */
  factor: z.number().optional(),
  /** Added to the shared value. Use for flat strength and satisfaction. */
  add: z.number().optional()
});
export type Effect = z.infer<typeof EffectSchema>;

export const StaffRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** What they do, in the player's terms. Shown on the hire card. */
  blurb: z.string(),
  /** One-off signing cost. */
  cost: z.number().min(0),
  /** Per matchday, for as long as they are employed. */
  wage: z.number().min(0),
  effects: z.array(EffectSchema).min(1)
});
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const StaffRolesSchema = z.array(StaffRoleSchema).min(1)
  .refine((rs) => new Set(rs.map((r) => r.id)).size === rs.length, {
    message: 'staff role ids must be unique'
  })
  .refine((rs) => rs.every((r) => r.effects.every((e) => e.factor !== undefined || e.add !== undefined)), {
    message: 'every effect must specify a factor or an add — an effect that does neither is decoration'
  });

export const STAFF_ROLES: StaffRole[] = StaffRolesSchema.parse([
  {
    id: 'coTrainer', name: 'Co-Trainer', cost: 6_000, wage: 800,
    blurb: 'Nimmt dir das Training ab und der Mannschaft die Ausreden.',
    effects: [{ key: 'squad.strengthBonus', add: 2 }]
  },
  {
    id: 'fitCoach', name: 'Athletik- & Konditionstrainer', cost: 5_000, wage: 600,
    blurb: 'Die Elf steht am 34. Spieltag noch. Das ist die ganze Kunst.',
    effects: [{ key: 'squad.fitnessLoss', factor: 0.7 }]
  },
  {
    id: 'physio', name: 'Chef-Physiotherapeut', cost: 5_500, wage: 700,
    blurb: 'Verhindert keine Verletzung. Verkürzt jede.',
    effects: [
      { key: 'squad.injuryDuration', factor: 0.5 },
      { key: 'squad.injuryRisk', factor: 0.85 }
    ]
  },
  {
    id: 'scout', name: 'Chef-Scout', cost: 6_500, wage: 750,
    blurb: 'Kennt jemanden, der jemanden kennt. Meistens stimmt es.',
    effects: [{ key: 'transfer.fee', factor: 0.85 }]
  },
  {
    id: 'greenkeeper', name: 'Head-Greenkeeper', cost: 3_000, wage: 400,
    blurb: 'Der Rasen ist sein Rasen. Ihr dürft darauf spielen.',
    effects: [{ key: 'matchday.homeStrength', add: 2 }]
  },
  {
    id: 'fanLiaison', name: 'Fanbeauftragter', cost: 3_500, wage: 450,
    blurb: 'Redet mit der Kurve, bevor die Kurve mit dir redet.',
    effects: [{ key: 'stadium.fans', add: 3 }]
  },
  {
    id: 'sportDir', name: 'Sportdirektor', cost: 9_000, wage: 1_100,
    blurb: 'Führt die Gespräche, die du nicht führen willst.',
    effects: [{ key: 'contracts.demand', factor: 0.8 }]
  },
  {
    id: 'marketingDir', name: 'Marketing-Direktor', cost: 7_500, wage: 900,
    blurb: 'Verkauft den Verein an Leute, die noch nie im Stadion waren.',
    effects: [
      { key: 'merch.online', factor: 1.6 },
      { key: 'sponsors.income', factor: 1.2 }
    ]
  }
]);

export function roleById(id: string): StaffRole | undefined {
  return STAFF_ROLES.find((r) => r.id === id);
}

/**
 * Effects, in the player's words.
 *
 * `{ key: 'squad.fitnessLoss', factor: 0.7 }` is what the engine needs and is
 * unreadable as a claim about the club. A hire card that says "squad.fitnessLoss
 * × 0.7" is asking the player to do the translation, and most will not — they
 * will hire on wage alone and never learn what the money bought.
 *
 * So every key that staff can touch has a phrasing here, and the phrasing takes
 * the VALUE, because "×0.7" and "×1.6" are opposite kinds of news and the same
 * sentence cannot carry both. A key with no phrasing renders as nothing rather
 * than as jargon — and `contentEffectsAreLabelled` fails the build instead, so
 * a silent effect cannot ship.
 */
type Phrase = (v: number) => string;
const pct = (v: number) => `${Math.round(Math.abs(v) * 100)} %`;
const less = (f: number) => `−${pct(1 - f)}`;
const more = (f: number) => `+${pct(f - 1)}`;

export const EFFECT_LABELS: Record<string, { factor?: Phrase; add?: Phrase }> = {
  'squad.strengthBonus':  { add: (v) => `+${v} Teamstärke in jedem Spiel` },
  'squad.fitnessLoss':    { factor: (f) => `${less(f)} Fitnessverlust nach Spielen` },
  'squad.injuryDuration': { factor: (f) => `${less(f)} Ausfallzeit bei Verletzungen` },
  'squad.injuryRisk':     { factor: (f) => `${less(f)} Verletzungsrisiko` },
  'transfer.fee':         { factor: (f) => `${less(f)} Ablöse beim Einkauf` },
  'matchday.homeStrength':{ add: (v) => `+${v} Heimstärke` },
  'stadium.fans':         { add: (v) => `+${v} Fan-Zufriedenheit je Spieltag` },
  'contracts.demand':     { factor: (f) => `${less(f)} Gehaltsforderungen bei Verlängerungen` },
  'merch.online':         { factor: (f) => `${more(f)} Online-Absatz im Fanshop` },
  'sponsors.income':      { factor: (f) => `${more(f)} Sponsoring-Einnahmen` }
};

/** One effect as a sentence, or null if the key has no phrasing. */
export function describeEffect(e: Effect): string | null {
  const l = EFFECT_LABELS[e.key];
  if (!l) return null;
  if (e.factor !== undefined && l.factor) return l.factor(e.factor);
  if (e.add !== undefined && l.add) return l.add(e.add);
  return null;
}

/** Build gate: no role may carry an effect the player cannot read. */
export function unlabelledEffects(): string[] {
  return STAFF_ROLES.flatMap((r) =>
    r.effects.filter((e) => describeEffect(e) === null).map((e) => `${r.id}: ${e.key}`)
  );
}
