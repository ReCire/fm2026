<script lang="ts">
  /**
   * Contracts screen, rebuilt around the one decision it exists for:
   * "is this player worth keeping, and for how long?"
   *
   * The previous version was a nine-column player table with two renewal
   * buttons rammed into every row — on a phone that read as a wall of
   * repeated buttons with the actual facts (how long is he still under
   * contract? what shape is he in?) buried behind a detail tap.
   *
   * Now: one card per player. The card leads with the two numbers the
   * decision runs on — the contract clock, drawn as a draining bar, and the
   * player's quality/condition — and the negotiation itself lives in a sheet
   * that opens on tap, where there is room to show what each term costs and
   * what wage it locks in. A renewal is a screen action, like a transfer
   * signing — it charges the ledger directly rather than through a tick,
   * because nobody should be billed for a decision they did not make.
   */
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, Sheet, toast } from '$lib/ui';
  import { postToLedger, formatMoney } from '../finance/module';
  import { wageBill, strengthOf } from '../squad/rules';
  import type { Player } from '../squad/state';
  import { renewalOptions, renewContract, type RenewalQuote } from './rules';
  import { contractsContent } from './content';

  const squad = $derived(game.modules.squad);
  const contracts = $derived(game.modules.contracts);
  const finance = $derived(game.modules.finance);

  const WARN = contractsContent.warnAtMatchdays;
  /** A season on the bar: a fresh one-season deal reads full, longer clips. */
  const SEASON = contractsContent.matchdaysPerSeason;

  const expiring = $derived(
    squad.players
      .filter((p) => p.contractMatchdays <= WARN)
      .sort((a, b) => a.contractMatchdays - b.contractMatchdays)
  );

  /*
   * Sort chips instead of a dropdown: every ordering visible, one tap away,
   * active one repeats-to-reverse. Restlaufzeit ascending is the default
   * because this screen's job is "who leaves next".
   */
  type SortKey = 'left' | 'wage' | 'str' | 'fit' | 'age';
  const SORTS: { key: SortKey; label: string; value: (p: Player) => number; asc: boolean }[] = [
    { key: 'left', label: 'Restlaufzeit', value: (p) => p.contractMatchdays, asc: true },
    { key: 'wage', label: 'Gehalt', value: (p) => p.wage, asc: false },
    { key: 'str', label: 'Stärke', value: (p) => strengthOf(p), asc: false },
    { key: 'fit', label: 'Fitness', value: (p) => p.fitness, asc: false },
    { key: 'age', label: 'Alter', value: (p) => p.age, asc: true }
  ];
  let sortKey = $state<SortKey>('left');
  let reversed = $state(false);
  const active = $derived(SORTS.find((s) => s.key === sortKey)!);
  const rows = $derived.by(() => {
    const dir = (active.asc ? 1 : -1) * (reversed ? -1 : 1);
    return [...squad.players].sort((a, b) => (active.value(a) - active.value(b)) * dir);
  });

  function pickSort(key: SortKey) {
    if (key === sortKey) reversed = !reversed;
    else { sortKey = key; reversed = false; }
  }

  /* The negotiation sheet. One player at a time, all terms side by side. */
  let open = $state(false);
  let pickedId = $state<string | null>(null);
  const picked = $derived(pickedId ? (squad.players.find((p) => p.id === pickedId) ?? null) : null);

  function show(p: Player) {
    pickedId = p.id;
    open = true;
  }

  function renew(player: Player, quote: RenewalQuote) {
    if (finance.money < quote.fee) {
      toast('Zu teuer', `Es fehlen ${formatMoney(quote.fee - finance.money)}.`, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'contracts',
      reason: `Vertragsverlängerung ${player.name}`,
      amount: -quote.fee
    });
    renewContract(player, quote);
    toast('Verlängert', `${player.name} — neues Gehalt ${formatMoney(quote.newWage)}`, 'good');
    open = false;
  }

  const clockTone = (left: number) => (left <= WARN ? 'danger' : left <= SEASON / 2 ? 'accent' : 'primary');
</script>

<Panel title="Verträge" accent="accent">
  <div class="chips">
    <StatChip label="Gehaltssumme" value={formatMoney(wageBill(squad))} doc="squad.wage" />
    <StatChip
      label="Läuft bald aus"
      value={expiring.length}
      tone={expiring.length > 0 ? 'warn' : 'neutral'}
      doc="contracts.expiring"
    />
    <StatChip label="Abgänge (Saison)" value={contracts.departures.length} doc="contracts.departures" />
  </div>
</Panel>

{#if expiring.length > 0}
  <!-- The act-now pile, separated so it cannot hide inside a sort order.
       These players walk for free in a handful of weeks. -->
  <Panel title="Läuft bald aus" accent="danger" meta="{expiring.length} Spieler">
    <ul class="cards urgent">
      {#each expiring as p (p.id)}
        <li>
          <!-- docs-check-ignore: opens the documented renewal sheet for this player -->
          <button class="card" onclick={() => show(p)}>
            <span class="who">
              <strong>{p.name}</strong>
              <span class="facts">{p.pos} · Stärke {strengthOf(p)} · {formatMoney(p.wage)}/ST</span>
            </span>
            <span class="clock danger tabular">
              {p.contractMatchdays === 0 ? 'letzter Spieltag' : `noch ${p.contractMatchdays} ST`}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </Panel>
{/if}

<Panel title="Vertragsübersicht" accent="primary" meta="{rows.length} Spieler">
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
        <!-- docs-check-ignore: opens the documented renewal sheet for this player -->
        <button class="card" onclick={() => show(p)}>
          <span class="who">
            <strong>{p.name}</strong>
            <span class="facts">
              {p.pos} · Stärke {strengthOf(p)} · {p.age} J. · {formatMoney(p.wage)}/ST
            </span>
            <span class="meters">
              <span class="meter">
                <em>Vertrag</em>
                <Bar value={p.contractMatchdays} max={SEASON} tone={clockTone(p.contractMatchdays)}
                     label="Restlaufzeit {p.name}" />
                <b class="tabular" class:soon={p.contractMatchdays <= WARN}>{p.contractMatchdays} ST</b>
              </span>
              <span class="meter">
                <em>Fitness</em>
                <Bar value={p.fitness} label="Fitness {p.name}" />
                <b class="tabular">{p.fitness}%</b>
              </span>
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
      {p.pos} · {p.age} Jahre · Stärke {strengthOf(p)} · Fitness {p.fitness}% · Moral {p.morale}
    </p>
    <dl class="sheet-terms">
      <dt>Restlaufzeit</dt>
      <dd class="tabular" class:soon={p.contractMatchdays <= WARN}>{p.contractMatchdays} Spieltage</dd>
      <dt>Aktuelles Gehalt</dt>
      <dd class="tabular">{formatMoney(p.wage)} / Spieltag</dd>
      <dt>Marktwert</dt>
      <dd class="tabular">{formatMoney(p.marketValue)}</dd>
      <dt>Forderung</dt>
      <dd class="tabular">+{Math.round(renewalOptions(p)[0]!.demandFactor * 100)} % Gehalt</dd>
    </dl>

    <div class="options">
      {#each renewalOptions(p) as quote (quote.doc)}
        <div class="option">
          <div class="option-head">
            <strong>{quote.label}</strong>
            <span class="tabular">{formatMoney(quote.fee)}</span>
          </div>
          <p class="option-sub">Neues Gehalt {formatMoney(quote.newWage)} / Spieltag</p>
          <Button
            doc={quote.doc}
            variant="secondary"
            label="Unterschreiben · {formatMoney(quote.fee)}"
            disabled={finance.money < quote.fee}
            onclick={() => renew(p, quote)}
          />
        </div>
      {/each}
    </div>
  </Sheet>
{/if}

<Panel title="Abgänge" accent="accent" meta="{contracts.departures.length} diese Saison">
  {#if contracts.departures.length === 0}
    <p class="empty">Noch kein ablösefreier Abgang in dieser Saison.</p>
  {:else}
    <ul class="departures">
      {#each contracts.departures as d, i (i)}
        <li><span>{d.name}</span><span class="dim">{d.pos}</span></li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; }
  .dim { color: var(--text-dim); }
  .soon { color: var(--neg-ink); font-weight: 800; }

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
    display: flex; align-items: center; gap: var(--s2);
    width: 100%; text-align: left; cursor: pointer;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: var(--s2) var(--s3);
    color: var(--text-main); font: inherit;
  }
  .card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .who { flex: 1; min-width: 0; display: grid; gap: var(--s1); }
  .who strong { font-size: var(--fs-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .facts { font-size: var(--fs-caption); color: var(--text-muted); }
  .go { flex: none; color: var(--text-dim); font-size: var(--fs-title); }

  .meters { display: grid; gap: var(--s1); }
  .meter {
    display: grid; grid-template-columns: 3.6rem 1fr auto; gap: var(--s2);
    align-items: center; font-size: var(--fs-caption);
  }
  .meter em { font-style: normal; color: var(--text-dim); }
  .meter b { color: var(--text-main); min-width: 3.2rem; text-align: right; }

  .urgent .clock { flex: none; font-size: var(--fs-caption); font-weight: 800; }
  .urgent .clock.danger { color: var(--neg-ink); }

  .sheet-facts { margin: 0 0 var(--s3); font-size: var(--fs-caption); color: var(--text-muted); }
  .sheet-terms {
    display: grid; grid-template-columns: auto 1fr; gap: var(--s1) var(--s3);
    margin: 0 0 var(--s4);
  }
  .sheet-terms dt { color: var(--text-muted); font-size: var(--fs-caption); }
  .sheet-terms dd { margin: 0; text-align: right; font-size: var(--fs-caption); color: var(--text-main); }

  .options { display: grid; gap: var(--s2); }
  .option {
    border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: var(--s2) var(--s3); display: grid; gap: var(--s1);
  }
  .option-head { display: flex; justify-content: space-between; align-items: baseline; }
  .option-sub { margin: 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .departures { list-style: none; margin: 0; padding: 0; }
  .departures li {
    display: flex; justify-content: space-between; gap: var(--s2);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border); font-size: var(--fs-body);
  }
  .departures li:last-child { border-bottom: 0; }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
