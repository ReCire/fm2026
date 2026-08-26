<script lang="ts">
  /**
   * PLACEHOLDER — written to keep the build green, not to ship.
   *
   * The transfer module's rules, state, content and docs were produced by a
   * subagent that was cut off before it wrote this screen or its tests. The
   * module is deliberately NOT registered in src/lib/modules.ts, so nothing
   * here reaches a player. See the WIP note in that file.
   */
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip } from '$lib/ui';
  import { formatMoney } from '../finance/rules';

  const transfer = $derived(game.modules.transfer);
</script>

<Panel title="Transfermarkt" accent="accent" meta="unfertig">
  <p class="wip">
    Dieses Modul ist noch nicht fertig portiert. Regeln und Daten stehen,
    die Oberfläche fehlt.
  </p>
  <div class="chips">
    <StatChip label="Angebote auf dem Markt" value={transfer?.market?.length ?? 0} doc="transfer.market" />
    <StatChip label="Eingehende Anfragen" value={transfer?.offers?.length ?? 0} doc="transfer.offers" />
    <StatChip label="Transferbudget" value={formatMoney(game.modules.finance.transferBudget)} doc="transfer.buy" />
  </div>
</Panel>

<style>
  .wip { color: var(--text-muted); font-size: var(--fs-small); margin-bottom: var(--sp-4); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-2); }
</style>
