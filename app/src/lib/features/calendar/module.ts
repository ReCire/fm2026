import { defineModule } from '$lib/engine/module';
import { CalendarSchema, createCalendar, CALENDAR_VERSION } from './state';

export default defineModule({
  id: 'calendar',
  title: 'Kalender',
  summary: 'Der Spielplan der eigenen Liga: nächster Spieltag, gespielte Partien, Ergebnisse.',
  nav: { group: 'Sport', icon: '📅', order: 25 },
  requires: ['league'],

  state: { schema: CalendarSchema, create: createCalendar, version: CALENDAR_VERSION }

  // No hooks. Every fact the calendar shows — the fixture, the matchday, the
  // scoreline — already lives in league's own state; this module reads it and
  // never advances anything of its own.
});
