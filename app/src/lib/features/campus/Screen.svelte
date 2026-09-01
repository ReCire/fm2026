<script lang="ts">
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Sheet, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import CampusMap from '$lib/graphics/CampusMap.svelte';
  import { ASSIGNMENT, HIDDEN_HOSTS } from '$lib/graphics/campus';
  import {
    categories, buildingById, totalCost, effectiveLevels, type Building
  } from '$lib/content/campus';
  import { canBuild, build, isMaxed, catalogue } from './rules';
  import { formatMoney, post } from '../finance/rules';
  import { ranks } from '../knowledge/rules';
  import { teamById } from '../league/rules';

  const campus = $derived(game.modules.campus);
  const finance = $derived(game.modules.finance);

  const registered = new Set(registry.all.map((m) => m.id));
  const ctx = $derived({ money: finance.money, registered, ranks: ranks(game.modules.knowledge) });

  /** One rule for "what level is this", shared with the map. */
  const levels = $derived(effectiveLevels(campus.built));
  const clubName = $derived(
    teamById(game.modules.league, game.modules.league.playerClubId)?.name ?? 'Vereinsgelände'
  );

  const priceOf = (b: Building): number | undefined => {
    const level = levels[b.id] ?? -1;
    return level + 1 >= b.costs.length ? undefined : b.costs[level + 1];
  };

  type Row = {
    building: Building;
    level: number;
    cost: number | undefined;
    reason: string;
    /** Sort bucket, and the only thing the eye has to parse. */
    state: 'ready' | 'saving' | 'locked' | 'done';
  };

  const rows = $derived.by<Row[]>(() =>
    catalogue(campus, ctx).map(({ building, check }) => {
      const level = levels[building.id] ?? -1;
      const cost = priceOf(building);
      const state: Row['state'] =
        cost === undefined ? 'done'
        : !check.ok && !/leisten/.test(check.reason) ? 'locked'
        : finance.money >= cost ? 'ready'
        : 'saving';
      return { building, level, cost, reason: check.reason, state };
    })
  );

  /*
   * Four buckets, in the order a manager thinks in.
   *
   * Eric: "make sure we see what can be bought". The catalogue was six panels
   * in category order, which is how a designer files things and not how anyone
   * shops — what you can afford today was scattered across all six and you had
   * to price twenty-four buildings in your head to find it.
   *
   * Affordable first, then what you are saving for, then what is out of reach,
   * then what is finished. Category becomes a filter rather than a heading,
   * because filtering is one tap and scrolling past five headings is not.
   */
  const ORDER: Record<Row['state'], number> = { ready: 0, saving: 1, locked: 2, done: 3 };

  let filter = $state<string>('alle');
  const visible = $derived(
    rows
      .filter((r) => filter === 'alle' || r.building.category === filter)
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.cost ?? 0) - (b.cost ?? 0))
  );
  const readyCount = $derived(rows.filter((r) => r.state === 'ready').length);

  /* The sheet is the whole point: the detail comes to the tap, not the other
     way round. Nothing on this screen navigates and nothing scrolls to find. */
  let open = $state(false);
  let picked = $state<string | null>(null);
  const chosen = $derived(picked ? (buildingById.get(picked) ?? null) : null);
  const chosenRow = $derived(chosen ? rows.find((r) => r.building.id === chosen.id) : undefined);

  function show(id: string | undefined) {
    if (!id) return;
    picked = id;
    open = true;
  }

  function doBuild(b: Building) {
    const row = rows.find((r) => r.building.id === b.id);
    if (!row || row.cost === undefined) return;
    if (row.state === 'locked') return toast('Nicht möglich', row.reason, 'warn');
    if (row.state === 'saving') {
      return toast('Zu teuer', `Es fehlen ${formatMoney(row.cost - finance.money)}.`, 'warn');
    }
    const level = row.level;
    build(campus, b);
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'campus',
      reason: `${b.name} — Stufe ${level + 2}`,
      amount: -row.cost
    });
    toast(b.name, b.levels[level + 1] ?? 'Fertiggestellt.', 'good');
    open = false;
  }

  const STATE_LABEL: Record<Row['state'], string> = {
    ready: 'baubar',
    saving: 'zu teuer',
    locked: 'gesperrt',
    done: 'fertig'
  };

  const isSecret = (b: Building) => b.id in HIDDEN_HOSTS;
  const accentOf = (id: string) => categories.find((c) => c.id === id)?.accent ?? 'primary';
</script>

<Panel title="Vereinsgelände" accent="primary" meta={clubName}>
  <div class="map">
    <CampusMap
      stadium={game.modules.stadium}
      {levels}
      {clubName}
      selected={picked ? Object.keys(ASSIGNMENT).find((k) => ASSIGNMENT[k] === picked) ?? null : null}
      onselect={(plotId) => show(ASSIGNMENT[plotId])}
    />
  </div>
  <div class="chips">
    <StatChip label="Sofort baubar" value={readyCount} doc="campus.build"
              tone={readyCount > 0 ? 'good' : 'neutral'} />
    <StatChip label="Investiert" value={formatMoney(campus.invested)} doc="campus.invested" />
    <StatChip label="Konto" value={formatMoney(finance.money)} doc="finance.balance"
              tone={finance.money < 0 ? 'bad' : 'good'} />
  </div>
</Panel>

<Panel title="Bauen" accent="accent" meta="{visible.length} Einrichtungen">
  <!-- Filters wrap rather than scrolling sideways. The scroll version hid its
       scrollbar, so on a phone half the categories simply did not exist — a
       filter you cannot see is a building you never find. Two short rows cost
       less than an invisible category. -->
  <div class="filters" role="tablist" aria-label="Kategorie">
    <!-- docs-check-ignore: a filter is a view control, not a game action -->
    <button role="tab" aria-selected={filter === 'alle'} class:on={filter === 'alle'}
            onclick={() => (filter = 'alle')}>Alle</button>
    {#each categories as c (c.id)}
      <!-- docs-check-ignore: a filter is a view control, not a game action -->
      <button role="tab" aria-selected={filter === c.id} class:on={filter === c.id}
              onclick={() => (filter = c.id)}>{c.label}</button>
    {/each}
  </div>

  <ul class="list">
    {#each visible as row (row.building.id)}
      <li>
        <!-- docs-check-ignore: opens the documented build sheet -->
        <button class="row {row.state}" onclick={() => show(row.building.id)}>
          <span class="main">
            <span class="name">
              {row.building.name}{#if isSecret(row.building)}<em class="secret">·</em>{/if}
            </span>
            <span class="sub">
              {row.level < 0 ? 'Nicht gebaut' : `Stufe ${row.level + 1} von ${row.building.costs.length}`}
              · {STATE_LABEL[row.state]}
            </span>
          </span>
          <span class="price tabular">{row.cost === undefined ? '—' : formatMoney(row.cost)}</span>
        </button>
      </li>
    {:else}
      <li class="none">In dieser Kategorie steht nichts an.</li>
    {/each}
  </ul>
  <p class="legend">
    Antippen öffnet die Ausbaustufen. Auf dem Lageplan funktioniert jedes Grundstück genauso.
    <Doc id="campus.map" />
  </p>
</Panel>

{#if chosen && chosenRow}
  <Sheet bind:open title={chosen.name}>
    <p class="cat">
      {categories.find((c) => c.id === chosen.category)?.label}
      · {STATE_LABEL[chosenRow.state]}
    </p>

    <!--
      Every level, not just the next one. An upgrade you cannot picture is an
      upgrade you do not want, and showing only the next step turns a building
      into a number that goes up.
    -->
    <ol class="ladder">
      {#each chosen.levels as text, i (i)}
        <li class:have={i <= chosenRow.level} class:next={i === chosenRow.level + 1}>
          <span class="step">{i + 1}</span>
          <span class="text">{text}</span>
          {#if i > chosenRow.level}
            <span class="cost tabular">
              {formatMoney(totalCost(chosen, i) - totalCost(chosen, chosenRow.level))}
            </span>
          {/if}
        </li>
      {/each}
    </ol>

    {#if isMaxed(campus, chosen)}
      <p class="done">Vollständig ausgebaut.</p>
    {:else if chosenRow.state === 'ready'}
      <Button doc="campus.build"
              label="{chosenRow.level < 0 ? 'Bauen' : 'Ausbauen'} — {formatMoney(chosenRow.cost ?? 0)}"
              onclick={() => doBuild(chosen)} />
    {:else}
      <p class="why" id="why-sheet">
        {chosenRow.state === 'saving'
          ? `Es fehlen ${formatMoney((chosenRow.cost ?? 0) - finance.money)}.`
          : chosenRow.reason}
        <Doc id="campus.locked" />
      </p>
      <Button doc="campus.build" blocked describedBy="why-sheet"
              label="Bauen — {formatMoney(chosenRow.cost ?? 0)}"
              onclick={() => doBuild(chosen)} />
    {/if}
  </Sheet>
{/if}

<style>
  .map { margin: 0 calc(var(--s3) * -1) var(--s3); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: var(--s2); }

  .filters {
    display: flex; flex-wrap: wrap; gap: var(--s2); margin-bottom: var(--s3);
  }
  .filters button {
    flex: 0 0 auto; min-height: var(--tap); padding: 0 var(--s3);
    background: var(--bg-sunken); border: 1px solid var(--border);
    border-radius: var(--r-lg); color: var(--text-muted);
    font: inherit; font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
  }
  .filters button.on {
    background: var(--primary); border-color: var(--primary); color: var(--on-fill);
  }

  .list { list-style: none; margin: 0; padding: 0; }
  .row {
    display: flex; align-items: center; justify-content: space-between; gap: var(--s3);
    width: 100%; min-height: var(--tap); padding: var(--s2) 0;
    background: none; border: 0; border-bottom: 1px solid var(--border);
    font: inherit; text-align: left; cursor: pointer; color: var(--text-main);
  }
  .main { display: grid; gap: 2px; min-width: 0; }
  .name { font-size: var(--fs-body); font-weight: 600; }
  .sub { font-size: var(--fs-caption); color: var(--text-muted); }
  .price { font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap; }
  .secret { color: var(--purple-ink); font-style: normal; font-weight: 700; }

  /*
   * State reads from the row's own weight, not from colour alone.
   *
   * "baubar" and "gesperrt" have to be separable in greyscale and by anyone who
   * cannot tell the greens from the reds — so what is buildable is at full
   * contrast and everything else is dimmed, and the word is in the row either
   * way.
   */
  .row.saving .name, .row.locked .name, .row.done .name { color: var(--text-muted); }
  .row.locked, .row.done { opacity: .7; }
  .row.ready .price { color: var(--primary-ink); font-weight: 700; }

  .none { padding: var(--s4) 0; color: var(--text-dim); font-size: var(--fs-caption); }
  .legend { margin: var(--s3) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .cat { margin: 0 0 var(--s3); font-size: var(--fs-caption); color: var(--text-muted); }
  .ladder { list-style: none; margin: 0 0 var(--s4); padding: 0; display: grid; gap: var(--s2); }
  .ladder li {
    display: grid; grid-template-columns: 22px 1fr auto; gap: var(--s2);
    align-items: start; padding: var(--s2) 0;
    border-bottom: 1px solid var(--border); color: var(--text-dim);
  }
  .ladder li:last-child { border-bottom: 0; }
  .ladder .step {
    width: 20px; height: 20px; border-radius: 50%;
    border: 1px solid var(--border-strong);
    font-size: 11px; font-weight: 700; text-align: center; line-height: 18px;
  }
  .ladder li.have { color: var(--text-main); }
  .ladder li.have .step { background: var(--primary); border-color: var(--primary); color: var(--on-fill); }
  .ladder li.next { color: var(--text-main); }
  .ladder li.next .step { border-color: var(--primary-ink); color: var(--primary-ink); }
  .ladder .cost { font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap; }

  .done { color: var(--primary-ink); font-size: var(--fs-caption); font-weight: 700; }
  .why { color: var(--text-muted); font-size: var(--fs-caption); margin: 0 0 var(--s2); }
</style>
