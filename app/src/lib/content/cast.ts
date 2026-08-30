import { z } from 'zod';

/**
 * The recurring cast — the people who write to you.
 *
 * Eleven of them, and they are the reason the inbox is a place rather than a
 * queue. A decision that arrives from "System" is a dialog box; the same
 * decision from Rocco Salvatore, who has asked you for something every season
 * since the fourth division, is a relationship you are managing badly.
 *
 * They recur on purpose and they are all slightly unpleasant on purpose. Nobody
 * here is your friend. The president is enthusiastic in a way that will cost
 * you money, the press is accurate in a way you will resent, and the agent is
 * the only one who says exactly what he wants.
 */

export const CastMemberSchema = z.object({
  name: z.string().min(3),
  /** Their job, as they would put it on a business card. */
  role: z.string().min(3)
});
export type CastMember = z.infer<typeof CastMemberSchema>;

/*
 * Deliberately no colour field.
 *
 * The prototype gave each character a hex, and it was wrong twice over. It put
 * eleven colour values outside `tokens.css`, which is the one file allowed to
 * define one — and more importantly it made a character's tint compete with the
 * domain tint of wherever they appeared, so a finance mail from the president
 * was gold on a finance screen and the player had to work out which of the two
 * colours meant anything. Neither did.
 *
 * Identity comes from the name and the face: `graphics/portrait.ts` already
 * derives a stable portrait from a seed hash, so the same person looks the same
 * everywhere without a palette entry. The accent belongs to the CONTEXT — a
 * transfer mail is a transfer mail whoever signed it.
 */
export const cast = z.record(z.string(), CastMemberSchema).parse({
  agent: { name: 'Rocco Salvatore', role: 'Spielerberater' },
  agent2: { name: 'Kevin-Pascal Brandt', role: 'Berater (Nachwuchs)' },
  board: { name: 'Dr. Hannelore Vogt', role: 'Aufsichtsratsvorsitz' },
  president: { name: 'Bernd Kuhlmann', role: 'Präsident' },
  press: { name: 'Redaktion BLÖD', role: 'Sportressort' },
  ultra: { name: 'Szene Nord', role: 'Vorsänger' },
  scout: { name: 'Ferdi Osterkamp', role: 'Chefscout' },
  physio: { name: 'Dr. Marion Kessler', role: 'Mannschaftsärztin' },
  lawyer: { name: 'Kanzlei Grau & Grau', role: 'Vereinsjustiziar' },
  it: { name: 'IT-Abteilung', role: 'Systembetreuung' },
  verband: { name: 'DFV Spielbetrieb', role: 'Verbandsgeschäftsstelle' }});

export type CastId = keyof typeof cast;
