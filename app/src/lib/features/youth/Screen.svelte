<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
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
  {#if youth.prospects.length === 0}
    <p class="empty">Keine Talente in der Akademie. Scoute eines, um anzufangen.</p>
  {:else}
    <ul class="prospects">
      {#each youth.prospects as p (p.id)}
        <li>
          <div class="head">
            <span class="pos">{p.pos}</span>
            <span class="who">{p.name}</span>
            <span class="age">{p.age} J.</span>
          </div>
          <div class="stats">
            <span class="dim">Stärke {strengthOf(p)}</span>
            <span class="dim">Graduiert mit {youthContent.graduationAge}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; }
  .dim { color: var(--text-dim); }

  .prospects { list-style: none; margin: 0; padding: 0; }
  .prospects li { padding: var(--s3) 0; border-bottom: 1px solid var(--border); }
  .prospects li:last-child { border-bottom: 0; }
  .head { display: flex; align-items: baseline; gap: var(--s2); margin-bottom: var(--s1); }
  .pos {
    flex: none; font-size: var(--fs-caption); color: var(--accent-ink);
    background: var(--bg-inset); border-radius: var(--r-sm); padding: 1px var(--s2);
  }
  .head .who { flex: 1; font-size: var(--fs-body); color: var(--text-main); }
  .age { font-size: var(--fs-caption); color: var(--text-dim); }
  .stats { display: flex; gap: var(--s3); font-size: var(--fs-caption); }
</style>
