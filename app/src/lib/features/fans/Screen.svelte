<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, toast } from '$lib/ui';
  import { formatMoney, post } from '../finance/rules';
  import { fanGroups, fanActions, stewardLevels, type FanAction } from './content';
  import { applyAction, canAfford, groupDef, overallMood, safetyOf } from './rules';

  const fans = $derived(game.modules.fans);
  const finance = $derived(game.modules.finance);

  const overall = $derived(Math.round(overallMood(fans)));
  const safety = $derived(safetyOf(fans.stewards));

  const toneOf = (pct: number): 'good' | 'warn' | 'bad' =>
    pct >= 66 ? 'good' : pct >= 33 ? 'warn' : 'bad';

  function setStewards(count: number) {
    fans.stewards = count;
  }

  function runAction(action: FanAction) {
    if (!canAfford(finance.money, action)) {
      toast('Zu teuer', `Es fehlen ${formatMoney(action.cost - finance.money)}.`, 'warn');
      return;
    }
    applyAction(fans, action);
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'fans',
      reason: action.label,
      amount: -action.cost
    });
    toast(action.label, 'Die Kurve dankt es.', 'good');
  }
</script>

<Panel title="Fan-Zentrale" accent="primary" meta="{overall} % Gesamtstimmung">
  <div class="chips">
    <StatChip label="Stimmung gesamt" value="{overall} %" doc="fans.overview" tone={toneOf(overall)} />
    <StatChip label="Ordner im Einsatz" value={fans.stewards} doc="fans.stewards" />
    <StatChip label="Sicherheitsquote" value="{safety} %" doc="fans.stewards" tone={toneOf(safety)} />
  </div>
</Panel>

<Panel title="Fangruppen" accent="accent">
  <ul class="groups">
    {#each fans.groups as group (group.id)}
      {@const def = groupDef(group.id)}
      {#if def}
        <li>
          <div class="head">
            <strong>{def.name}</strong>
            <span class="mood tabular">{Math.round(group.mood)} %</span>
          </div>
          <Bar value={group.mood} label={def.name} />
          <p class="desc">{def.desc}</p>
        </li>
      {/if}
    {/each}
  </ul>
</Panel>

<Panel title="Ordnerdienst" accent="accent">
  <div class="grid">
    {#each stewardLevels as level (level.count)}
      <Button
        doc="fans.stewards"
        variant={fans.stewards === level.count ? 'primary' : 'secondary'}
        label="{level.count} ({level.label})"
        onclick={() => setStewards(level.count)}
      />
    {/each}
  </div>
</Panel>

<Panel title="Aktionen für die Kurve" accent="gold">
  <div class="grid">
    {#each fanActions as action (action.id)}
      <Button doc="fans.action" label="{action.label} — {formatMoney(action.cost)}" onclick={() => runAction(action)} />
    {/each}
  </div>
  <p class="rule">
    {#each fanActions as action (action.id)}
      <span class="hint">{action.label}: {action.desc}</span>
    {/each}
  </p>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }

  .groups { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s3); }
  .groups li { display: grid; gap: 4px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s2); }
  .mood { font-weight: 700; color: var(--text-main); }
  .desc { margin: 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }

  .rule { margin: var(--s3) 0 0; display: grid; gap: 2px; }
  .hint { display: block; font-size: var(--fs-caption); color: var(--text-muted); }
</style>
