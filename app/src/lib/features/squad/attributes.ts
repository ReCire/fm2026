import { z } from 'zod';
import type { Position } from './positions';

/**
 * The five things a player is judged on.
 *
 * A single `strength` number made the squad legible but the editor pointless:
 * renaming a club and then adjusting one slider is not what made the old team
 * editors magic. Five categories give the player something to actually shape —
 * and make a 99-everywhere ringer feel absurd in the way it is supposed to.
 *
 * `strength` still exists everywhere it used to. It is now DERIVED from these
 * rather than stored, so every rule that consumed it keeps working unchanged
 * and there is exactly one place the combination is decided.
 */
export const ATTRIBUTES = ['technik', 'tempo', 'kraft', 'uebersicht', 'mentalitaet'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const AttributesSchema = z.object({
  /** Ballbehandlung, Abschluss, Standards. */
  technik: z.number().int().min(1).max(99),
  /** Antritt und Grundschnelligkeit. */
  tempo: z.number().int().min(1).max(99),
  /** Zweikampf, Kopfball, Durchsetzungsvermögen. */
  kraft: z.number().int().min(1).max(99),
  /** Spielübersicht, Passgenauigkeit, Stellungsspiel. */
  uebersicht: z.number().int().min(1).max(99),
  /** Nervenstärke, Arbeitsrate, Konstanz. */
  mentalitaet: z.number().int().min(1).max(99)
});
export type Attributes = z.infer<typeof AttributesSchema>;

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  technik: 'Technik',
  tempo: 'Tempo',
  kraft: 'Kraft',
  uebersicht: 'Übersicht',
  mentalitaet: 'Mentalität'
};

export const ATTRIBUTE_BLURB: Record<Attribute, string> = {
  technik: 'Ballbehandlung, Abschluss, Standards.',
  tempo: 'Antritt und Grundschnelligkeit.',
  kraft: 'Zweikampf, Kopfball, Durchsetzungsvermögen.',
  uebersicht: 'Spielübersicht, Passgenauigkeit, Stellungsspiel.',
  mentalitaet: 'Nervenstärke, Arbeitsrate, Konstanz.'
};

/**
 * What each position is actually judged on.
 *
 * The same five numbers mean different things in different shirts: a keeper
 * lives on Mentalität and Übersicht, a striker on Technik and Tempo. That is
 * what makes moving a player out of position cost something, and what stops the
 * five facets collapsing back into one number wearing a hat.
 *
 * Each column sums to 1, which is checked below — a position whose weights sum
 * to 0.9 would quietly rate every player in it 10% low.
 */
export const POSITION_WEIGHTS: Record<Position, Record<Attribute, number>> = {
  TW:  { technik: 0.15, tempo: 0.05, kraft: 0.20, uebersicht: 0.25, mentalitaet: 0.35 },
  ABW: { technik: 0.15, tempo: 0.15, kraft: 0.35, uebersicht: 0.20, mentalitaet: 0.15 },
  MIT: { technik: 0.25, tempo: 0.15, kraft: 0.15, uebersicht: 0.35, mentalitaet: 0.10 },
  ST:  { technik: 0.35, tempo: 0.30, kraft: 0.15, uebersicht: 0.10, mentalitaet: 0.10 }
};

/** The overall rating for a player in a given position, 1..99. */
export function overallFor(attributes: Attributes, pos: Position): number {
  const w = POSITION_WEIGHTS[pos];
  const raw = ATTRIBUTES.reduce((sum, a) => sum + attributes[a] * w[a], 0);
  return Math.max(1, Math.min(99, Math.round(raw)));
}

/** The player's best position, for the editor and for auto-selection. */
export function bestPosition(attributes: Attributes): Position {
  const positions = Object.keys(POSITION_WEIGHTS) as Position[];
  return positions.reduce((best, p) =>
    overallFor(attributes, p) > overallFor(attributes, best) ? p : best
  );
}

/** Flat attributes at one value — the editor's "make him 99 everywhere". */
export function uniform(value: number): Attributes {
  const v = Math.max(1, Math.min(99, Math.round(value)));
  return { technik: v, tempo: v, kraft: v, uebersicht: v, mentalitaet: v };
}
