<script lang="ts">
  import { game, advance, lastTick, registry } from '$lib/state/game.svelte';
  import { canUndo } from '$lib/state/history.svelte';
  import { undo } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, fromEvent } from '$lib/ui';
  import { formatMoney, matchdayNet, breakdown } from '$lib/features/finance/rules';
  import { attendance, capacity } from '$lib/features/stadium/rules';
  import { wageBill, teamStrength } from '$lib/features/squad/rules';

  const finance = $derived(game.modules.finance);
  const squad = $derived(game.modules.squad);
  const stadium = $derived(game.modules.stadium);

  const lastNet = $derived(matchdayNet(finance, game.meta.season, game.meta.matchday - 1));
  const lastBreakdown = $derived(breakdown(finance, game.meta.season, game.meta.matchday - 1));

  function playMatchday() {
    const result = advance('matchday');
    for (const e of result.events) fromEvent(e);
  }

  function stepBack() {
    if (!undo()) return;
  }
</script>

<Panel title="Zentrale" accent="accent" meta="Saison {game.meta.season}">
  <div class="chips">
    <StatChip label="Vereins-Konto" value={formatMoney(finance.money)} doc="finance.balance"
              tone={finance.money < 0 ? 'bad' : 'good'} />
    <StatChip label="Transferbudget" value={formatMoney(finance.transferBudget)} doc="finance.transferBudget" />
    <StatChip label="Gehälter / Spieltag" value={formatMoney(wageBill(squad))} doc="squad.wage" />
    <StatChip label="Teamstärke" value={teamStrength(squad, true)} doc="squad.strength" />
    <StatChip label="Zuschauer" value={attendance(stadium).toLocaleString('de-DE')} doc="stadium.attendance" />
    <StatChip label="Kapazität" value={capacity(stadium).toLocaleString('de-DE')} doc="stadium.capacity" />
  </div>

  <div class="actions">
    <Button doc="game.advance" onclick={playMatchday} explain />
    <Button doc="game.undo" variant="ghost" onclick={stepBack} disabled={!canUndo()} />
  </div>
</Panel>

{#if lastTick.result}
  <Panel title="Spieltagsbericht" accent="primary" meta={formatMoney(lastNet)}>
    <ul class="events">
      {#each lastTick.result.events as e, i (i)}
        <li class={e.severity}>
          <strong>{e.title}</strong>
          {#if e.detail}<span>{e.detail}</span>{/if}
          {#if e.amount !== undefined}<em class="tabular">{formatMoney(e.amount)}</em>{/if}
        </li>
      {/each}
    </ul>

    <h4>Nach Quelle</h4>
    <ul class="sources">
      {#each lastBreakdown as row (row.source)}
        <li>
          <span>{registry.byId.get(row.source)?.title ?? row.source}</span>
          <em class="tabular" class:neg={row.amount < 0}>{formatMoney(row.amount)}</em>
        </li>
      {/each}
    </ul>
  </Panel>
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .actions { display: flex; flex-direction: column; gap: var(--s2); }
  .events { list-style: none; display: flex; flex-direction: column; gap: var(--s2); }
  .events li {
    border-left: 3px solid var(--text-dim);
    padding: var(--s2) var(--s2);
    background: rgba(0,0,0,0.25);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    display: grid;
  }
  .events .good { border-left-color: var(--primary); }
  .events .warn { border-left-color: var(--accent); }
  .events .bad { border-left-color: var(--danger); }
  .events .info { border-left-color: var(--blue); }
  .events strong { font-size: var(--fs-body); }
  .events span { font-size: var(--fs-caption); color: var(--text-muted); }
  .events em { font-style: normal; font-size: var(--fs-caption); color: var(--text-muted); }
  h4 { font-size: var(--fs-caption); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin: var(--s3) 0 var(--s2); }
  .sources { list-style: none; display: flex; flex-direction: column; gap: 2px; }
  .sources li { display: flex; justify-content: space-between; padding: var(--s1) 0; border-bottom: 1px solid var(--border); }
  .sources em { font-style: normal; color: var(--primary); }
  .sources .neg { color: var(--danger); }
</style>
