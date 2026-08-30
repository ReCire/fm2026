<script lang="ts">
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import CampusMap from '$lib/graphics/CampusMap.svelte';
  import { ASSIGNMENT, HIDDEN_HOSTS } from '$lib/graphics/campus';
  import { categories, buildingById, totalCost, effectiveLevels, type Building } from '$lib/content/campus';
  import { levelOf, canBuild, build, isMaxed, progress, catalogue } from './rules';
  import { formatMoney, post } from '../finance/rules';
  import { ranks } from '../knowledge/rules';
  import { teamById } from '../league/rules';

  const campus = $derived(game.modules.campus);
  const finance = $derived(game.modules.finance);

  const registered = new Set(registry.all.map((m) => m.id));
  const ctx = $derived({ money: finance.money, registered, ranks: ranks(game.modules.knowledge) });

  /*
   * One rule for "what level is this", shared with the map.
   *
   * A founding building is inherited, not bought: `costs[0] === 0` means the
   * club already has it. Without this the map drew four rusting containers
   * while the catalogue offered to sell you a Kabinentrakt for €0 — two rules
   * for one fact, both defensible, visibly disagreeing.
   */
  const levels = $derived(effectiveLevels(campus.built));
  const done = $derived(progress(campus, registered));
  const rows = $derived(
    catalogue(campus, ctx).map((r) => ({
      ...r,
      level: levels[r.building.id] ?? -1,
      cost: priceOf(r.building)
    }))
  );
  const clubName = $derived(
    teamById(game.modules.league, game.modules.league.playerClubId)?.name ?? 'Vereinsgelände'
  );

  let picked = $state<string | null>(null);
  const chosen = $derived(picked ? (buildingById.get(picked) ?? null) : null);

  /** A plot tap resolves to whatever stands on it — or is meant to. */
  function fromPlot(plotId: string) {
    const id = ASSIGNMENT[plotId];
    picked = id && picked !== id ? id : null;
  }

  /**
   * The price of the next step, from the effective level.
   *
   * Not `nextCost`, which reads the stored level — and a founding building is
   * stored as "unbuilt" while the club is standing in it. The rules would
   * quote €0 to build changing rooms that already exist, and the ladder above
   * would show them owned. One rule, so `effectiveLevels` decides both.
   */
  function priceOf(b: Building): number | undefined {
    const level = levels[b.id] ?? -1;
    if (level + 1 >= b.costs.length) return undefined;
    return b.costs[level + 1];
  }

  const affordable = (b: Building) => {
    const p = priceOf(b);
    return p !== undefined && finance.money >= p;
  };

  function doBuild(b: Building) {
    const check = canBuild(campus, b, ctx);
    if (!check.ok) return toast('Nicht möglich', check.reason, 'warn');
    const level = levels[b.id] ?? -1;
    const cost = priceOf(b);
    if (cost === undefined) return;
    if (finance.money < cost) {
      return toast('Zu teuer', `Es fehlen ${formatMoney(cost - finance.money)}.`, 'warn');
    }

    /*
     * Record the inherited level before upgrading past it.
     *
     * `build` steps the STORED level, and a founding building has never been
     * stored — so one call would move it from "unbuilt" to level 0, charging
     * nothing and leaving the ladder exactly where it was. Seeding first makes
     * the second call the upgrade the player actually pressed.
     *
     * This adapter disappears the day `createCampus` seeds founding buildings
     * at level 0, which is where the rule belongs.
     */
    if (levelOf(campus, b.id) < 0 && level >= 0) build(campus, b);
    build(campus, b);
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'campus',
      reason: `${b.name} — Stufe ${level + 2}`,
      amount: -cost
    });
    toast(b.name, b.levels[level + 1] ?? 'Fertiggestellt.', 'good');
  }

  const byCategory = $derived(
    categories.map((c) => ({ category: c, items: rows.filter((r) => r.building.category === c.id) }))
  );

  /** Concealed facilities are listed but never located. */
  const isSecret = (b: Building) => b.id in HIDDEN_HOSTS;
</script>

<Panel title="Vereinsgelände" accent="primary" meta="{done.built} von {done.total} gebaut">
  <!--
    The map first, and at full width.

    Everything below it is a list of prices, and a list of prices is what this
    screen would have been. The picture is the only part that answers "what does
    my club look like" — which is the question a manager actually has about their
    own ground, and the one no column of figures has ever answered.
  -->
  <div class="map">
    <CampusMap
      stadium={game.modules.stadium}
      {levels}
      {clubName}
      onselect={fromPlot}
    />
  </div>
  <div class="chips">
    <StatChip label="Investiert" value={formatMoney(campus.invested)} doc="campus.invested" />
    <StatChip label="Gebaut" value="{done.built} / {done.total}" doc="campus.level" />
    <StatChip label="Vereinskonto" value={formatMoney(finance.money)} doc="finance.balance"
              tone={finance.money < 0 ? 'bad' : 'good'} />
  </div>
  <p class="legend">
    Die Höhe jeder Tribüne ist die Kapazität ihres Blocks. Gestrichelte Flächen sind
    Grundstücke, auf denen noch nichts steht. <Doc id="campus.map" />
  </p>
</Panel>

{#if chosen}
  {@const level = levels[chosen.id] ?? -1}
  {@const check = canBuild(campus, chosen, ctx)}
  {@const cost = priceOf(chosen)}
  <Panel
    title={chosen.name}
    accent={categories.find((c) => c.id === chosen.category)?.accent ?? 'primary'}
    meta={level < 0 ? 'Nicht gebaut' : `Stufe ${level + 1} von ${chosen.levels.length}`}
  >
    <!--
      Every level, not just the next one.

      An upgrade you cannot picture is an upgrade you do not want, and the
      version that shows only the next step turns a building into a number that
      goes up. Seeing all three at once is what makes the third one a plan.
    -->
    <ol class="ladder">
      {#each chosen.levels as text, i (i)}
        <li class:have={i <= level} class:next={i === level + 1}>
          <span class="step">{i + 1}</span>
          <span class="text">{text}</span>
          {#if i > level}
            <span class="cost tabular">{formatMoney(totalCost(chosen, i) - totalCost(chosen, level))}</span>
          {/if}
        </li>
      {/each}
    </ol>

    {#if isMaxed(campus, chosen)}
      <p class="maxed">Vollständig ausgebaut.</p>
    {:else if check.ok && cost !== undefined && affordable(chosen)}
      <Button doc="campus.build"
              label="{level < 0 ? 'Bauen' : 'Ausbauen'} — {formatMoney(cost)}"
              onclick={() => doBuild(chosen)} />
    {:else}
      <p class="why" id="why-{chosen.id}">
        {check.ok && cost !== undefined
          ? `Es fehlen ${formatMoney(cost - finance.money)}.`
          : check.reason}
        <Doc id="campus.locked" />
      </p>
      <Button doc="campus.build" blocked describedBy="why-{chosen.id}"
              label={cost === undefined ? 'Ausgebaut' : `Bauen — ${formatMoney(cost)}`}
              onclick={() => doBuild(chosen)} />
    {/if}
  </Panel>
{/if}

{#each byCategory as group (group.category.id)}
  <Panel title={group.category.label} accent={group.category.accent}
         meta="{group.items.filter((i) => i.level >= 0).length} / {group.items.length}">
    <p class="note">{group.category.note}</p>
    <ul class="list">
      {#each group.items as row (row.building.id)}
        <!-- docs-check-ignore: a catalogue row is navigation, not a control -->
        <button
          class="row" class:on={picked === row.building.id}
          class:built={row.level >= 0}
          onclick={() => (picked = picked === row.building.id ? null : row.building.id)}
        >
          <span class="name">
            {row.building.name}
            {#if isSecret(row.building)}<em class="hidden-mark" title="Steht auf keinem Lageplan">·</em>{/if}
          </span>
          <span class="state">
            {#if row.level >= 0}
              <i class="pips" aria-hidden="true">
                {#each row.building.levels as _, i (i)}<b class:lit={i <= row.level}></b>{/each}
              </i>
            {:else if !row.check.ok}
              gesperrt
            {:else}
              frei
            {/if}
          </span>
          <span class="price tabular">{row.cost === undefined ? '—' : formatMoney(row.cost)}</span>
        </button>
      {/each}
    </ul>
  </Panel>
{/each}

<style>
  /* Bleed the map to the panel edges: it is a place, and a place with a margin
     around it reads as an illustration of a place. */
  .map { margin: 0 calc(var(--s3) * -1); }
  .chips {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--s2); margin-top: var(--s3);
  }
  .legend, .note {
    margin: var(--s3) 0 0; font-size: var(--fs-caption);
    color: var(--text-muted); line-height: var(--lh-body);
  }
  .note { margin: 0 0 var(--s3); }

  .ladder { list-style: none; margin: 0 0 var(--s3); padding: 0; display: grid; gap: var(--s2); }
  .ladder li {
    display: grid; grid-template-columns: 22px 1fr auto; gap: var(--s2);
    align-items: start; padding: var(--s2) 0;
    border-bottom: 1px solid var(--border);
    color: var(--text-dim);
  }
  .ladder li:last-child { border-bottom: 0; }
  .ladder .step {
    width: 20px; height: 20px; border-radius: 50%;
    border: 1px solid var(--border-strong);
    font-size: 11px; font-weight: 700; text-align: center; line-height: 18px;
  }
  /* Owned levels are the club's own history and read as normal text; the next
     one is the only thing here you can act on, so it is the only thing lit. */
  .ladder li.have { color: var(--text-main); }
  .ladder li.have .step { background: var(--primary); border-color: var(--primary); color: var(--on-fill); }
  .ladder li.next { color: var(--text-main); }
  .ladder li.next .step { border-color: var(--primary-ink); color: var(--primary-ink); }
  .ladder .cost { font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap; }

  .maxed { color: var(--primary-ink); font-size: var(--fs-caption); font-weight: 700; }
  .why { color: var(--text-muted); font-size: var(--fs-caption); margin: 0 0 var(--s2); }

  .list { list-style: none; margin: 0; padding: 0; }
  .row {
    display: grid; grid-template-columns: 1fr auto auto; gap: var(--s3);
    align-items: center; width: 100%; min-height: var(--tap);
    padding: var(--s2) 0; background: none; border: 0;
    border-bottom: 1px solid var(--border);
    font: inherit; color: var(--text-dim); text-align: left; cursor: pointer;
  }
  .row:last-child { border-bottom: 0; }
  .row.built { color: var(--text-main); }
  .row.on { color: var(--text-main); }
  .row.on .name { font-weight: 700; }
  .name { font-size: var(--fs-body); }
  .hidden-mark { color: var(--purple-ink); font-style: normal; font-weight: 700; }
  .state { font-size: var(--fs-caption); color: var(--text-muted); }
  .price { font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap; }

  /* Level as marks rather than "2/3". A count invites ranking; marks read as a
     position on a ladder, which is what it is. */
  .pips { display: inline-flex; gap: 3px; }
  .pips b { width: 6px; height: 6px; border-radius: 1px; background: var(--border-strong); }
  .pips b.lit { background: var(--primary); }
</style>
