<script lang="ts">
  /**
   * Squad screen, same shape as contracts: one card per player, the
   * negotiation-room details in a sheet.
   *
   * The DataTable version compressed a player into six columns and hid the
   * lineup action behind a per-row button that repeated twenty-two times —
   * on a phone that read as a wall of "Aufstellen" with the actual player
   * lost between the buttons. A card leads with what picking an eleven runs
   * on: who he is, how good, what shape — and the card itself says whether
   * he is in the eleven. Everything else waits in the sheet.
   */
  import { strengthOf } from './rules';
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, Bar, Leaderboard, Sheet, toast } from '$lib/ui';
  import { autoLineup, toggleLineup, wageBill, teamStrength, isAvailable, rating } from './rules';
  import { standoutOf } from './playerColumns';
  import { ATTRIBUTE_LABEL } from './attributes';
  import type { Player } from './state';
  import { formatMoney } from '../finance/rules';

  const squad = $derived(game.modules.squad);
  const inLineup = (id: string) => squad.lineup.includes(id);

  /*
   * Sort chips, not a dropdown — the same control the contracts screen uses,
   * so the two player lists in the game order themselves the same way.
   * "Elf" groups the current eleven on top, which is the view you check last
   * before a matchday.
   */
  type SortKey = 'elf' | 'str' | 'fit' | 'wage' | 'age' | 'pos';
  const SORTS: { key: SortKey; label: string; value: (p: Player) => number; asc: boolean }[] = [
    { key: 'elf', label: 'Elf', value: (p) => (inLineup(p.id) ? 0 : 1), asc: true },
    { key: 'str', label: 'Stärke', value: (p) => strengthOf(p), asc: false },
    { key: 'fit', label: 'Fitness', value: (p) => (isAvailable(p) ? p.fitness : -1), asc: false },
    { key: 'wage', label: 'Gehalt', value: (p) => p.wage, asc: false },
    { key: 'age', label: 'Alter', value: (p) => p.age, asc: true },
    { key: 'pos', label: 'Position', value: (p) => ['TW', 'ABW', 'MIT', 'ST'].indexOf(p.pos), asc: true }
  ];
  let sortKey = $state<SortKey>('elf');
  let reversed = $state(false);
  const active = $derived(SORTS.find((s) => s.key === sortKey)!);
  const rows = $derived.by(() => {
    const dir = (active.asc ? 1 : -1) * (reversed ? -1 : 1);
    // Rating as the stable tie-breaker, so "Elf" and "Position" stay readable.
    return [...squad.players].sort(
      (a, b) => (active.value(a) - active.value(b)) * dir || rating(b) - rating(a)
    );
  });

  function pickSort(key: SortKey) {
    if (key === sortKey) reversed = !reversed;
    else { sortKey = key; reversed = false; }
  }

  /* The player sheet: full facts, and the lineup decision. */
  let open = $state(false);
  let pickedId = $state<string | null>(null);
  const picked = $derived(pickedId ? (squad.players.find((p) => p.id === pickedId) ?? null) : null);

  function show(p: Player) {
    pickedId = p.id;
    open = true;
  }

  function setLineup() {
    squad.lineup = autoLineup(squad);
    toast('Aufstellung gesetzt', `Teamstärke ${teamStrength(squad, true)}`, 'good');
  }

  function toggle(p: Player) {
    const change = toggleLineup(squad, p.id);
    if (change === 'full') return toast('Elf ist voll', 'Erst jemanden rausnehmen, dann aufstellen.', 'warn');
    if (change === 'unavailable') return toast('Nicht verfügbar', `${p.name} kann nicht aufgestellt werden.`, 'warn');
    toast(
      change === 'added' ? 'Aufgestellt' : 'Auf der Bank',
      `${p.name} — ${squad.lineup.length} / 11 · Teamstärke ${teamStrength(squad, true)}`,
      'good'
    );
  }

  const stateOf = (p: Player) =>
    p.injured > 0 ? `🚑 ${p.injured}` : p.suspended > 0 ? `🟥 ${p.suspended}` : null;
</script>

<Panel title="Kader" accent="primary" meta="{squad.players.length} Spieler">
  <div class="summary">
    <span>Teamstärke <strong class="tabular">{teamStrength(squad, true)}</strong></span>
    <span>Gehälter <strong class="tabular">{formatMoney(wageBill(squad))}</strong></span>
    <span>Aufgestellt <strong class="tabular">{squad.lineup.length} / 11</strong></span>
  </div>
  <Button doc="squad.autoLineup" onclick={setLineup} explain />
</Panel>

<Panel title="Spieler" accent="accent">
  <div class="sortbar" role="group" aria-label="Sortieren nach">
    {#each SORTS as s (s.key)}
      <!-- docs-check-ignore: view ordering, named by the chip itself; changes nothing in the game -->
      <button type="button" class="chip" class:on={sortKey === s.key}
              aria-pressed={sortKey === s.key}
              onclick={() => pickSort(s.key)}>
        {s.label}
        {#if sortKey === s.key}<i aria-hidden="true">{(s.asc ? !reversed : reversed) ? '▲' : '▼'}</i>{/if}
      </button>
    {/each}
  </div>

  <ul class="cards">
    {#each rows as p (p.id)}
      <li>
        <!-- docs-check-ignore: opens the documented player sheet (squad.toggleLineup lives inside) -->
        <button class="card" class:elf={inLineup(p.id)} onclick={() => show(p)}>
          <span class="str tabular" aria-label="Stärke">{strengthOf(p)}</span>
          <span class="who">
            <strong class:out={!isAvailable(p)}>
              {p.name}
              {#if inLineup(p.id)}<span class="badge">Elf</span>{/if}
              {#if stateOf(p)}<span class="badge hurt">{stateOf(p)}</span>{/if}
            </strong>
            <span class="facts">{p.pos} · {p.age} J. · {formatMoney(p.wage)}/ST</span>
            <span class="meter">
              <em>Fitness</em>
              <Bar value={p.fitness} label="Fitness {p.name}" />
              <b class="tabular">{p.fitness}%</b>
            </span>
          </span>
          <span class="go" aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ul>
</Panel>

{#if picked}
  {@const p = picked}
  <Sheet bind:open title={p.name}>
    <p class="sheet-facts">
      {p.pos} · {p.age} Jahre · {p.trait !== 'Kein' ? `${p.trait} · ` : ''}Stärkste Eigenschaft:
      {ATTRIBUTE_LABEL[standoutOf(p)]} {p.attributes[standoutOf(p)]}
    </p>

    <div class="sheet-meters">
      <span class="meter">
        <em>Fitness</em>
        <Bar value={p.fitness} label="Fitness" />
        <b class="tabular">{p.fitness}%</b>
      </span>
      <span class="meter">
        <em>Moral</em>
        <Bar value={p.morale} label="Moral" />
        <b class="tabular">{p.morale}</b>
      </span>
    </div>

    <dl class="sheet-terms">
      <dt>Stärke</dt><dd class="tabular">{strengthOf(p)}</dd>
      <dt>Gehalt</dt><dd class="tabular">{formatMoney(p.wage)} / Spieltag</dd>
      <dt>Marktwert</dt><dd class="tabular">{formatMoney(p.marketValue)}</dd>
      <dt>Vertrag</dt><dd class="tabular">noch {p.contractMatchdays} Spieltage</dd>
      <dt>Bilanz</dt>
      <dd>
        {p.record.matches} Spiele{p.record.goals > 0 ? ` · ${p.record.goals} Tore` : ''}{p.record.cleanSheets > 0 ? ` · ${p.record.cleanSheets} zu null` : ''}
      </dd>
      {#if p.injured > 0}<dt>Verletzt</dt><dd class="soon">noch {p.injured} Spieltage</dd>{/if}
      {#if p.suspended > 0}<dt>Gesperrt</dt><dd class="soon">noch {p.suspended} Spieltage</dd>{/if}
    </dl>

    <Button
      doc="squad.toggleLineup"
      variant={inLineup(p.id) ? 'ghost' : 'primary'}
      label={inLineup(p.id) ? 'Aus der Elf nehmen' : 'In die Startelf'}
      disabled={!inLineup(p.id) && (!isAvailable(p) || squad.lineup.length >= 11)}
      onclick={() => toggle(p)}
    />
  </Sheet>
{/if}

<!--
  Who has actually done the work.

  The squad list answers "how good is he", which is a scouting question. This
  answers "what has he done here", which is the one a manager asks in the third
  season — and it is the only place in the game where a player's career is
  visible as a career rather than as five current attributes.

  Top three then everything, the Sportschau pattern: three boards at three rows
  is a glance, three boards at twenty-two rows is a scroll.
-->
{#if squad.players.some((p) => p.record.matches > 0)}
  <Panel title="Bestenliste" accent="primary" meta="{squad.players.length} Spieler">
    <!--
      Torjäger first, because it is the first thing anyone wants from a football
      stats screen — and the only one of these boards a player would look up
      without being prompted.

      Scoped to our own squad, and that is not a limitation to hide. The match
      model does not name opposition scorers, so a division-wide board would
      have to invent them — and an invented statistic is indistinguishable from
      a real one, which makes it worse than a missing tab. Here the screen is
      the squad, so "Torjäger" already means ours without a qualifier.

      The subtitle carries appearances, because 14 goals in 34 games and 14 in
      9 are different players and the ranking cannot tell them apart.
    -->
    <Leaderboard
      title="Torjäger"
      unit="Tore"
      entries={squad.players
        .filter((p) => p.record.goals > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sub: `${p.pos} · ${p.record.matches} ${p.record.matches === 1 ? 'Spiel' : 'Spiele'}`,
          value: p.record.goals,
          row: p
        }))}
      empty="Noch kein Tor gefallen."
    />
    <Leaderboard
      title="Einsätze"
      unit="Spiele"
      entries={squad.players.map((p) => ({
        id: p.id, name: p.name, sub: p.pos, value: p.record.matches, row: p
      }))}
    />
    <Leaderboard
      title="Weiße Westen"
      unit="Spiele ohne Gegentor"
      entries={squad.players
        .filter((p) => p.pos === 'TW' || p.pos === 'ABW')
        .map((p) => ({ id: p.id, name: p.name, sub: p.pos, value: p.record.cleanSheets, row: p }))}
      empty="Noch kein Spiel ohne Gegentor."
    />
    <Leaderboard
      title="Weiteste Entwicklung"
      unit="Punkte"
      entries={squad.players.map((p) => ({
        id: p.id,
        name: p.name,
        sub: `${p.record.debutStrength} → ${strengthOf(p)}`,
        value: strengthOf(p) - p.record.debutStrength,
        row: p
      }))}
      format={(v) => (v > 0 ? `+${v}` : String(v))}
    />
  </Panel>
{/if}

<style>
  .summary { display: flex; flex-wrap: wrap; gap: var(--s3); margin-bottom: var(--s3); color: var(--text-muted); font-size: var(--fs-caption); }
  .summary strong { color: var(--text-main); font-size: var(--fs-body); display: block; }

  .sortbar {
    display: flex; gap: var(--s2); padding-bottom: var(--s2);
    overflow-x: auto; -webkit-overflow-scrolling: touch;
  }
  .chip {
    flex: 0 0 auto; min-height: var(--tap); padding: 0 var(--s3);
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-lg); color: var(--text-muted);
    font: inherit; font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
  }
  .chip.on { background: var(--primary); border-color: var(--primary); color: var(--on-fill); }
  .chip i { font-style: normal; font-size: 9px; }
  .chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  .cards { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s2); }
  .card {
    display: flex; align-items: center; gap: var(--s3);
    width: 100%; text-align: left; cursor: pointer;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: var(--s2) var(--s3);
    color: var(--text-main); font: inherit;
  }
  .card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  /* The eleven read as the eleven: same two channels as the league table's
     own-club row — a fill and an edge bar, not colour alone. */
  .card.elf { background: var(--primary-glow); box-shadow: inset 3px 0 0 var(--primary); }

  /* Strength as the anchor figure: the one number every squad question starts
     from, big enough to compare down the list without reading a word. */
  .str {
    flex: none; min-width: 2.2rem; text-align: center;
    font-family: var(--font-num); font-size: var(--fs-title); font-weight: 800;
    color: var(--primary-ink);
  }

  .who { flex: 1; min-width: 0; display: grid; gap: var(--s1); }
  .who strong { font-size: var(--fs-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .facts { font-size: var(--fs-caption); color: var(--text-muted); }
  .go { flex: none; color: var(--text-dim); font-size: var(--fs-title); }

  .meter {
    display: grid; grid-template-columns: 3.6rem 1fr auto; gap: var(--s2);
    align-items: center; font-size: var(--fs-caption);
  }
  .meter em { font-style: normal; color: var(--text-dim); }
  .meter b { color: var(--text-main); min-width: 3.2rem; text-align: right; }

  .sheet-facts { margin: 0 0 var(--s3); font-size: var(--fs-caption); color: var(--text-muted); }
  .sheet-meters { display: grid; gap: var(--s2); margin-bottom: var(--s3); }
  .sheet-terms {
    display: grid; grid-template-columns: auto 1fr; gap: var(--s1) var(--s3);
    margin: 0 0 var(--s4);
  }
  .sheet-terms dt { color: var(--text-muted); font-size: var(--fs-caption); }
  .sheet-terms dd { margin: 0; text-align: right; font-size: var(--fs-caption); color: var(--text-main); }
  .soon { color: var(--neg-ink); font-weight: 800; }

  .tabular { font-variant-numeric: tabular-nums; }
</style>
