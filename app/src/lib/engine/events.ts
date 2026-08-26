/**
 * The event log. This is what replaces `alert()`.
 *
 * A hook never interrupts the player. It emits an event; the matchday report
 * collects them and renders them together. That makes the outcome of a tick
 * inspectable in a test, replayable, and pleasant on a phone.
 */
export type EventSeverity = 'info' | 'good' | 'warn' | 'bad';

export interface GameEvent {
  /** Module that emitted it, so the report can group and filter. */
  source: string;
  severity: EventSeverity;
  title: string;
  detail?: string;
  /** Optional money delta, so the finance report can be built from events alone. */
  amount?: number;
  /** Deep-link target: a module id the player can jump to from the report. */
  goto?: string;
}

export function isNegative(e: GameEvent): boolean {
  return e.severity === 'bad' || e.severity === 'warn';
}
