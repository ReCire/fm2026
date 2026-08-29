<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button } from '$lib/ui';
  import { teamById } from '../league/rules';
  import { resolveClub } from '../editor/rules';
  import { CALENDAR_FILTERS, type CalendarFilter } from './state';
  import { seasonSchedule, applyFilter, nextMatch, seasonTally } from './rules';

  const league = $derived(game.modules.league);
  const calendar = $derived(game.modules.calendar);
  const editor = $derived(game.modules.editor);

  const schedule = $derived(seasonSchedule(league));
  const rows = $derived(applyFilter(schedule, calendar.filter));
  const next = $derived(nextMatch(schedule));
  const tally = $derived(seasonTally(schedule));
  const currentMatchday = $derived(game.meta.matchday);

  const FILTER_LABEL: Record<CalendarFilter, string> = {
    all: 'Alle',
    upcoming: 'Kommend',
    played: 'Gespielt'
  };

  /* Every name on this screen — ours and the opponent's — goes through the
     editor's override layer. A club is identified by id everywhere above this
     line; this is the one place that turns an id back into text. */
  function opponentName(id: string): string {
    const t = teamById(league, id);
    if (!t) return '—';
    return resolveClub(editor, { id: t.id, name: t.name, short: '', city: '', colours: ['#000000', '#ffffff'] as const })
      .name;
  }

  function setFilter(f: CalendarFilter) {
    calendar.filter = f;
  }
</script>

<Panel title="Kalender" accent="accent" meta="Saison {game.meta.season}">
  <div class="chips">
    <StatChip
      label="Nächstes Spiel"
      value={next ? `${next.isHome ? 'H' : 'A'} · ${opponentName(next.opponentId)}` : 'Saisonende'}
      doc="calendar.next"
    />
    <StatChip label="Bilanz" value="{tally.wins}S {tally.draws}U {tally.losses}N" doc="calendar.record" />
  </div>
</Panel>

<Panel title="Spielplan" accent="primary" meta="Spieltag {Math.min(currentMatchday, schedule.length || 1)} / {schedule.length}">
  <div class="filters">
    {#each CALENDAR_FILTERS as f (f)}
      <Button
        doc="calendar.filter"
        label={FILTER_LABEL[f]}
        variant={calendar.filter === f ? 'primary' : 'secondary'}
        onclick={() => setFilter(f)}
      />
    {/each}
  </div>

  {#if rows.length === 0}
    <p class="empty">Keine Einträge für diese Ansicht.</p>
  {:else}
    <ul class="schedule">
      {#each rows as m (m.matchday)}
        <li class:current={m.matchday === currentMatchday} class:played={m.played}>
          <span class="md">Spieltag {m.matchday}</span>
          <span class="opp">{m.isHome ? 'H' : 'A'} · {opponentName(m.opponentId)}</span>
          {#if m.played}
            <strong class="score">
              <i class="glyph" aria-hidden="true">{m.result === 'win' ? '▲' : m.result === 'loss' ? '▼' : '■'}</i>
              {m.isHome ? `${m.goalsFor}:${m.goalsAgainst}` : `${m.goalsAgainst}:${m.goalsFor}`}
              <span class="vh"
                >({m.result === 'win' ? 'Sieg' : m.result === 'loss' ? 'Niederlage' : 'Unentschieden'})</span
              >
            </strong>
          {:else if m.matchday === currentMatchday}
            <span class="today">HEUTE</span>
          {:else}
            <span class="pending">–:–</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .filters { display: flex; gap: var(--s2); margin-bottom: var(--s2); }

  .schedule { list-style: none; display: grid; gap: var(--s1); }
  .schedule li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--s2);
    padding: var(--s2);
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    font-size: var(--fs-caption);
  }
  .schedule li.current { border-color: var(--primary-ink); }
  .md {
    color: var(--text-dim);
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .opp { color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .score {
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-main);
  }
  .today { color: var(--primary-ink); font-weight: 800; white-space: nowrap; }
  .pending { color: var(--text-dim); font-family: var(--font-num); font-variant-numeric: tabular-nums; }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s3) 0; }
</style>
