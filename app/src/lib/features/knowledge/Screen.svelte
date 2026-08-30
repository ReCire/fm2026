<script lang="ts">
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import { postToLedger } from '../finance/module';
  import { formatMoney } from '../finance/rules';
  import {
    doctrines, knowledgeNodes, tierNames, fxLabels, flagLabels, affinityOf, affinityLabels,
    type KnowledgeNode, type FxKey
  } from './content';
  import { canBuy, costOf, dormancyOf, rankOf, research, census } from './rules';

  const k = $derived(game.modules.knowledge);
  const level = $derived(game.modules.league.playerLevel);

  /* Derived from the registry once, at boot. See rules.ts — a stored flag goes
     stale in the direction of "marked dormant but actually works". */
  const consumed = registry.consumedKeys();
  const counts = census(consumed);

  let open = $state<string | null>(null);
  const doctrine = $derived(open ? doctrines.find((d) => d.id === open) : undefined);

  const nodesOf = (id: string) =>
    knowledgeNodes.filter((n) => n.doctrine === id).sort((a, b) => a.tier - b.tier);

  function effectLines(node: KnowledgeNode): string[] {
    const lines = Object.entries(node.fx ?? {})
      .map(([key, v]) => fxLabels[key as FxKey]?.(v as number))
      .filter((s): s is string => !!s);
    for (const f of node.flags ?? []) lines.push(flagLabels[f]);
    return lines;
  }

  function buy(node: KnowledgeNode) {
    const check = canBuy(k, node, { money: game.modules.finance.money, leagueLevel: level, consumed });
    if (!check.ok) return toast('Nicht möglich', check.reason, 'warn');
    research(k, node, level, (amount, reason) =>
      postToLedger(game.modules.finance, {
        season: game.meta.season, matchday: game.meta.matchday,
        source: 'knowledge', reason, amount
      })
    );
    toast(node.name, 'Erforscht. Die Wirkung greift ab dem nächsten Spieltag.', 'good');
  }
</script>

<Panel title="Doktrin" accent="industry" meta="{k.owned.length} von {knowledgeNodes.length}">
  <div class="chips">
    <StatChip label="Wissenspunkte" value={k.points} doc="knowledge.points"
              tone={k.points > 0 ? 'good' : 'neutral'} />
    <StatChip label="Erforscht" value={k.owned.length} doc="knowledge.tree" />
    <StatChip label="Verfügbar" value={counts.live} doc="knowledge.dormant" />
  </div>
  <p class="intro">
    Acht Doktrinen, und die Entscheidung, welche davon du nicht gehst.
    <Doc id="knowledge.tree" />
  </p>
  {#if counts.live < knowledgeNodes.length}
    <p class="muted">
      {knowledgeNodes.length - counts.live} Knoten sind ausgearbeitet, aber noch nicht spielwirksam
      und deshalb gesperrt. <Doc id="knowledge.dormant" />
    </p>
  {/if}
</Panel>

{#if !doctrine}
  <Panel title="Doktrinen">
    <ul class="doctrines">
      {#each doctrines as d (d.id)}
        {@const mine = rankOf(k, d.id)}
        <!-- docs-check-ignore: a list row is navigation, not a control -->
        <button class="row" onclick={() => (open = d.id)}>
          <span class="ico" aria-hidden="true">{d.glyph}</span>
          <span class="meta">
            <strong>{d.name}</strong>
            <small>{d.creed}</small>
          </span>
          <span class="rank tabular">{mine}/{nodesOf(d.id).length}</span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      {/each}
    </ul>
  </Panel>
{:else}
  <Panel title={doctrine.name} accent="industry" meta="Rang {rankOf(k, doctrine.id)}">
    <!-- docs-check-ignore: back link, not a control -->
    <button class="back" onclick={() => (open = null)}>← Alle Doktrinen</button>
    <p class="intro">{doctrine.creed}</p>
    <ul class="affinity">
      {#each doctrines.filter((o) => o.id !== doctrine.id && affinityOf(doctrine.id, o.id) !== 'neutral') as other (other.id)}
        <li class={affinityOf(doctrine.id, other.id)}>
          {other.name} — {affinityLabels[affinityOf(doctrine.id, other.id)]}
        </li>
      {/each}
    </ul>
  </Panel>

  {#each nodesOf(doctrine.id) as node (node.id)}
    {@const owned = k.owned.includes(node.id)}
    {@const state = dormancyOf(node, consumed)}
    {@const check = canBuy(k, node, { money: game.modules.finance.money, leagueLevel: level, consumed })}
    {@const cost = costOf(node, level)}
    <Panel title="{node.icon} {node.name}" accent={owned ? 'primary' : 'accent'}
           meta="{tierNames[node.tier]} · {cost.points} WP">
      <p class="lore">{node.lore}</p>
      <ul class="fx">
        {#each effectLines(node) as line (line)}<li>{line}</li>{/each}
      </ul>

      {#if owned}
        <p class="owned">✓ Erforscht</p>
      {:else if state !== 'live'}
        <p class="locked">
          Noch nicht spielwirksam — dieser Knoten ist gesperrt. <Doc id="knowledge.dormant" />
        </p>
      {:else}
        <p class="price">
          {cost.points} {cost.points === 1 ? 'Wissenspunkt' : 'Wissenspunkte'} · {formatMoney(cost.money)}
        </p>
        {#if check.ok}
          <Button doc="knowledge.research" onclick={() => buy(node)} />
        {:else}
          <p class="why" id="why-{node.id}">{check.reason}</p>
          <Button doc="knowledge.research" blocked describedBy="why-{node.id}"
                  onclick={() => toast('Nicht möglich', check.reason, 'warn')} />
        {/if}
      {/if}
    </Panel>
  {/each}
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .intro { color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-body); }
  .muted { color: var(--text-dim); font-size: var(--fs-caption); line-height: var(--lh-body); margin-top: var(--s2); }

  .back {
    background: none; border: 0; color: var(--industry-ink); font-family: inherit;
    font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
    padding: var(--s2) 0; min-height: var(--tap);
  }

  .doctrines { list-style: none; margin: 0; padding: 0; }
  .row {
    display: flex; align-items: center; gap: var(--s3); width: 100%; text-align: left;
    background: none; border: 0; border-bottom: 1px solid var(--border);
    padding: var(--s2) 0; cursor: pointer; font-family: inherit; min-height: var(--tap);
  }
  .row .ico { flex: none; font-size: 22px; }
  .row .meta { flex: 1; min-width: 0; }
  .row strong { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .row small { display: block; font-size: var(--fs-caption); color: var(--text-muted); }
  .rank { flex: none; font-family: var(--font-num); font-size: var(--fs-caption); color: var(--text-dim); }
  .chev { flex: none; color: var(--text-dim); }

  .affinity { list-style: none; margin: var(--s2) 0 0; padding: 0; font-size: var(--fs-caption); }
  .affinity li { padding: 2px 0; color: var(--text-muted); }
  /* Glyph-free, but the two states never appear without their own word, so
     hue is reinforcement rather than the only channel. */
  .affinity li.allied { color: var(--pos-ink); }
  .affinity li.hostile { color: var(--neg-ink); }

  .lore { font-size: var(--fs-body); color: var(--text-main); line-height: var(--lh-body); margin-bottom: var(--s2); }
  .fx { list-style: none; margin: 0 0 var(--s3); padding: 0; }
  .fx li { font-size: var(--fs-caption); color: var(--industry-ink); padding: 1px 0; }
  .price { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
  .owned { font-size: var(--fs-body); color: var(--pos-ink); font-weight: 700; }
  .locked { font-size: var(--fs-caption); color: var(--text-dim); line-height: var(--lh-body); }
  .why { font-size: var(--fs-caption); color: var(--accent-ink); margin-bottom: var(--s2); }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
