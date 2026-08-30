<script lang="ts">
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import { postToLedger } from '../finance/module';
  import { formatMoney } from '../finance/rules';
  import {
    doctrinesInOrder, knowledgeNodes, tierNames, fxLabels, flagLabels, affinityOf, affinityLabels,
    type KnowledgeNode, type FxKey
  } from './content';
  import DoctrineTree from '$lib/graphics/DoctrineTree.svelte';
  import { canBuy, costOf, dormancyOf, rankOf, research, census } from './rules';

  const k = $derived(game.modules.knowledge);
  const level = $derived(game.modules.league.playerLevel);

  /* Derived from the registry once, at boot. See rules.ts — a stored flag goes
     stale in the direction of "marked dormant but actually works". */
  const consumed = registry.consumedKeys();
  const counts = census(consumed);

  let open = $state<string | null>(null);
  const doctrine = $derived(open ? doctrinesInOrder.find((d) => d.id === open) : undefined);

  let picked = $state<string | null>(null);
  const node = $derived(picked ? knowledgeNodes.find((n) => n.id === picked) : undefined);

  /* Computed once per doctrine rather than per node, so the tree can colour
     140 marks without running the affordability check 140 times per keystroke. */
  const openNow = $derived.by(() => {
    const ids = new Set<string>();
    if (!doctrine) return ids;
    for (const n of nodesOf(doctrine.id)) {
      if (canBuy(k, n, { money: game.modules.finance.money, leagueLevel: level, consumed }).ok) {
        ids.add(n.id);
      }
    }
    return ids;
  });
  const dormantIds = $derived.by(() => {
    const ids = new Set<string>();
    if (!doctrine) return ids;
    for (const n of nodesOf(doctrine.id)) {
      if (dormancyOf(n, consumed) !== 'live') ids.add(n.id);
    }
    return ids;
  });

  const nodesOf = (id: string) =>
    knowledgeNodes.filter((n) => n.doctrine === id).sort((a, b) => a.tier - b.tier);

  function effectLines(node: KnowledgeNode): string[] {
    const lines = Object.entries(node.fx ?? {})
      .map(([key, v]) => fxLabels[key as FxKey]?.(v as number))
      .filter((s): s is string => !!s);
    for (const f of node.flags ?? []) lines.push(flagLabels[f]);
    return lines;
  }

  /* The doctrine's colour, resolved to a token. tokens.css is the only file
     allowed to define one, so this maps to the existing accent vocabulary
     rather than minting eight more. */
  const TINT: Record<string, string> = {
    talent: 'var(--primary)', psyche: 'var(--purple)', data: 'var(--blue)',
    curve: 'var(--danger)', brand: 'var(--accent)', industry: 'var(--industry)',
    politics: 'var(--stocks, var(--blue))', shadow: 'var(--purple)'
  };
  const tintFor = (id: string) => TINT[id] ?? 'var(--primary)';

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
      {#each doctrinesInOrder as d (d.id)}
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
      {#each doctrinesInOrder.filter((o) => o.id !== doctrine.id && affinityOf(doctrine.id, o.id) !== 'neutral') as other (other.id)}
        <li class={affinityOf(doctrine.id, other.id)}>
          {other.name} — {affinityLabels[affinityOf(doctrine.id, other.id)]}
        </li>
      {/each}
    </ul>
  </Panel>

  <!--
    The tree, not fourteen stacked panels.

    A list of fourteen cards is accurate and answers none of the questions a
    player actually has here: how far in am I, what is next, and how much
    further to the capstone. Those are shape questions, and only a shape
    answers them — rows are tiers, lines are prerequisites, and the distance
    between what you own and the last node is a distance you can see.

    Tapping a node opens it below rather than navigating away, because
    comparing two nodes means looking at the tree between them.
  -->
  <Panel title="Der Baum" accent="industry"
         meta="{rankOf(k, doctrine.id)} von {nodesOf(doctrine.id).length}">
    <div class="tree" style="--doctrine-tint: {tintFor(doctrine.id)}">
      <DoctrineTree
        nodes={nodesOf(doctrine.id)}
        owned={new Set(k.owned)}
        shape={doctrine.shape}
        affordable={openNow}
        dormant={dormantIds}
        selected={picked}
        onselect={(id) => (picked = picked === id ? null : id)}
      />
    </div>
    <ul class="key">
      <li><i class="sw owned"></i>freigeschaltet</li>
      <li><i class="sw open"></i>verfügbar</li>
      <li><i class="sw dorm"></i>noch nicht wirksam</li>
      <li><i class="sw lock"></i>gesperrt</li>
    </ul>
  </Panel>

  {#if node}
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
  {:else}
    <p class="hint">Tippe einen Knoten an, um zu sehen was er kostet und was er bewirkt.</p>
  {/if}
{/if}

<style>
  .tree { margin: 0 calc(var(--s3) * -1); }
  .key {
    list-style: none; margin: var(--s3) 0 0; padding: 0;
    display: flex; flex-wrap: wrap; gap: var(--s3);
    font-size: var(--fs-caption); color: var(--text-muted);
  }
  .key li { display: flex; align-items: center; gap: var(--s1); }
  .sw { width: 11px; height: 11px; border-radius: 2px; border: 2px solid var(--border-strong); }
  .sw.owned { background: var(--primary); border-color: var(--primary); }
  .sw.open { border-color: var(--primary); }
  .sw.dorm { border-style: dashed; opacity: .6; }
  .hint { color: var(--text-dim); font-size: var(--fs-caption); text-align: center; padding: var(--s4) 0; }
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
