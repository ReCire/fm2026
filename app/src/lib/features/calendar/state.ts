import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * The calendar owns almost nothing.
 *
 * Every fixture, every result and the current matchday already live in
 * `league` and `state.meta` — copying any of it here would just create a
 * second place for the two to disagree, which is exactly the class of bug
 * `standings()` in league/rules.ts was written to stop. The one thing this
 * screen has of its own is how the player likes to read the season list.
 */
export const CALENDAR_FILTERS = ['all', 'upcoming', 'played'] as const;
export type CalendarFilter = (typeof CALENDAR_FILTERS)[number];

export const CalendarSchema = z.object({
  /** Which slice of the season the list shows. A display preference only. */
  filter: z.enum(CALENDAR_FILTERS)
});
export type CalendarState = z.infer<typeof CalendarSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    calendar: CalendarState;
  }
}

export function createCalendar(_rng: Rng): CalendarState {
  return { filter: 'all' };
}

export const CALENDAR_VERSION = 1;
