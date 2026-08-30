<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, DataTable, toast } from '$lib/ui';
  import type { Column } from '$lib/ui';
  import { playerColumns, playerCell } from '../squad/playerColumns';
  import type { Player } from '../squad/state';
  import { postToLedger, formatMoney } from '../finance/module';
  import { strengthOf } from '../squad/rules';
  import { levelUpgradeCost, capacity, scoutCost, canUpgrade, canScout, upgrade, scout, scoutRng } from './rules';
  import { youthContent } from './content';

  const youth = $derived(game.modules.youth);
  const finance = $derived(game.modules.finance);

  const upgradeCost = $derived(levelUpgradeCost(youth.level));
  const cap = $derived(capacity(youth.level));
  const nextScoutCost = $derived(scoutCost(youth.level));

  function buyUpgrade() {
    if (!canUpgrade(youth)) return;
    if (finance.money < upgradeCost) {
      toast('Zu teuer', `Es fehlen ${formatMoney(upgradeCost - finance.money)}.`, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'youth',
      reason: 'Ausbau Jugendakademie',
      amount: -upgradeCost
    });
    upgrade(youth);
    toast('Akademie ausgebaut', `Level ${youth.level}`, 'good');
  }

  function scoutNow() {
    if (!canScout(youth)) {
      toast('Kein Platz', 'Die Akademie ist voll — erst ein Level ausbauen oder warten, bis jemand aufsteigt.', 'warn');
      return;
    }
    if (finance.money < nextScoutCost) {
      toast('Zu teuer', `Es fehlen ${formatMoney(nextScoutCost - finance.money)}.`, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'youth',
      reason: 'Talent gescoutet',
      amount: -nextScoutCost
    });
    const prospect = scout(youth, scoutRng(youth, game.meta.seed));
    if (prospect) toast('Talent gefunden', `${prospect.name}, ${prospect.age} Jahre, ${prospect.pos}`, 'good');
  }

  /*
   * Shared player columns plus the one fact that is only true in here.
   * Sorted by strength first, because the academy screen is read to answer
   * "which of these is actually going to be a player?".
   */
  const COLUMNS: Column[] = [
    ...playerColumns,
    {
      key: 'graduates', label: 'Graduiert', role: 'secondary',
      firstClick: 'asc',
      sort: (p) => (p as Player).age
    }
  ];
</script>

<Panel title="Jugendakademie" accent="accent">
  <div class="chips">
    <StatChip label="Akademie-Level" value="{youth.level} / {youthContent.maxLevel}" doc="youth.level" />
    <StatChip label="Kapazität" value="{youth.prospects.length} / {cap}" doc="youth.capacity" />
  </div>
  <div class="actions">
    <Button
      doc="youth.upgrade"
      variant="secondary"
      label="Akademie ausbauen · {formatMoney(upgradeCost)}"
      disabled={!canUpgrade(youth) || finance.money < upgradeCost}
      onclick={buyUpgrade}
    />
    <Button
      doc="youth.scout"
      label="Talent scouten · {formatMoney(nextScoutCost)}"
      disabled={!canScout(youth) || finance.money < nextScoutCost}
      onclick={scoutNow}
    />
  </div>
</Panel>

<Panel title="Talente" accent="primary" meta="{youth.prospects.length} in der Akademie">
  <!-- The same table as everywhere else a player is listed.
       A prospect is exactly where the player most needs to see state: the whole
       decision is "is this one worth the years?", and a name with a strength
       number cannot answer it. Now his shape, his age, his strongest facet and
       his talent are all on one row — and the table sorts, so "who is closest
       to graduating" and "who is best" are one click apart. -->
  <DataTable
    columns={COLUMNS}
    rows={youth.prospects}
    id={(p) => p.id}
    title={(p) => p.name}
    defaultSort="strength"
    empty="Keine Talente in der Akademie. Scoute eines, um anzufangen."
  >
    {#snippet cell(r, key)}
      {#if key === 'graduates'}
        <span class="dim">mit {youthContent.graduationAge} ({Math.max(0, youthContent.graduationAge - r.age)} J.)</span>
      {:else}
        <span class:dim={key !== 'name' && key !== 'strength'}>{playerCell(r, key)}</span>
      {/if}
    {/snippet}
  </DataTable>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }
  .dim { color: var(--text-dim); }

</style>
