<script lang="ts">
  /**
   * Training screen, brought in line with contracts and squad: chips for the
   * one-of-N choices, cards for the player list, a sheet for the per-player
   * decision.
   *
   * The old version was three hand-rolled radio groups and a native select
   * element per player — four different form controls for what is always the
   * same gesture, "pick one of these". Now it is one gesture everywhere: a chip
   * row for the team focus, a chip row for the intensity (with the active
   * one's consequence printed underneath, where the choice is made), and the
   * individual focus behind a tap on the player's card.
   */
  import { game, advance } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, Sheet, fromEvent, toast } from '$lib/ui';
  import { FOCUS, FOCUS_LABEL, ATTRIBUTE_LABEL, type Focus, type Attribute } from '../squad/attributes';
  import { INTENSITIES } from './state';
  import { INTENSITY_LABEL, INTENSITY_BLURB } from './content';
  import { restFor, seasonProgress, focusOf } from './rules';
  import { isAvailable } from '../squad/rules';
  import type { Player } from '../squad/state';

  const t = $derived(game.modules.training);
  const squad = $derived(game.modules.squad);
  const inWeek = $derived(game.modules.core.phase === 'week');

  const fit = $derived.by(() => {
    if (squad.players.length === 0) return 0;
    return Math.round(squad.players.reduce((s, p) => s + p.fitness, 0) / squad.players.length);
  });
  const injured = $derived(squad.players.filter((p) => p.injured > 0).length);

  /* Newest first, and gains before losses within the week — the player is
     looking for what improved, and a bad line is easier to find in a short
     list than a good one is in a long one. */
  const movers = $derived([...t.lastWeek].sort((a, b) => b.delta - a.delta));

  function trainWeek() {
    for (const e of advance('week').events) fromEvent(e);
  }

  /* The focus sheet: one player, every focus as a full-width option. */
  let open = $state(false);
  let pickedId = $state<string | null>(null);
  const picked = $derived(pickedId ? (squad.players.find((p) => p.id === pickedId) ?? null) : null);

  function show(p: Player) {
    pickedId = p.id;
    open = true;
  }

  function setFocus(p: Player, f: Focus) {
    p.individualFocus = f;
    toast(
      'Schwerpunkt gesetzt',
      `${p.name} trainiert ${f === 'allgemein' ? `mit der Mannschaft (${FOCUS_LABEL[t.teamFocus]})` : FOCUS_LABEL[f]}.`,
      'good'
    );
    open = false;
  }
</script>

<Panel title="Trainingswoche" accent="primary" meta="Woche {t.weeks + 1} · Saison {game.meta.season}">
  <div class="chips">
    <StatChip label="Ø Fitness" value={fit} doc="squad.fitness"
              tone={fit >= 80 ? 'good' : fit < 60 ? 'bad' : 'neutral'} />
    <StatChip label="Erholung" value="+{restFor(t.intensity)}" doc="training.intensity" />
    <StatChip label="Verletzt" value={injured} doc="squad.injury"
              tone={injured > 0 ? 'bad' : 'neutral'} />
    <StatChip label="Einsatzbereit" value={squad.players.filter(isAvailable).length} doc="squad.strength" />
  </div>

  {#if inWeek}
    <Button doc="game.week" onclick={trainWeek} explain />
  {:else}
    <p class="dim">Die Woche ist gelaufen. Der nächste Schritt ist der Spieltag.</p>
  {/if}
</Panel>

<Panel title="Schwerpunkt &amp; Intensität" accent="accent">
  <fieldset>
    <legend>Mannschaftsschwerpunkt</legend>
    <div class="picks" role="group" aria-label="Mannschaftsschwerpunkt">
      {#each FOCUS as f (f)}
        <!-- docs-check-ignore: documented as a group (training.teamFocus) -->
        <button type="button" class="chip" class:on={t.teamFocus === f}
                aria-pressed={t.teamFocus === f}
                onclick={() => (t.teamFocus = f)}>{FOCUS_LABEL[f]}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Intensität</legend>
    <div class="picks" role="group" aria-label="Intensität">
      {#each INTENSITIES as i (i)}
        <!-- docs-check-ignore: documented as a group (training.intensity) -->
        <button type="button" class="chip" class:on={t.intensity === i}
                aria-pressed={t.intensity === i}
                onclick={() => (t.intensity = i)}>{INTENSITY_LABEL[i]}</button>
      {/each}
    </div>
    <!-- The consequence of the ACTIVE choice, printed where the choice is
         made. Three cards each carrying their own blurb made the reader
         compare paragraphs; one line under the track answers "and what does
         that mean" for the option actually chosen. -->
    <p class="blurb">{INTENSITY_BLURB[t.intensity]}</p>
  </fieldset>
</Panel>

<Panel title="Letzte Trainingswoche" accent="gold" meta="{movers.length} Veränderung{movers.length === 1 ? '' : 'en'}">
  {#if movers.length === 0}
    <p class="dim">Noch keine Woche trainiert. Fortschritt zeigt sich hier, sobald die Woche gelaufen ist.</p>
  {:else}
    <ul class="movers">
      {#each movers as c (c.playerId + c.attribute)}
        <li>
          <!-- Glyph and sign, not colour alone: a plus and a minus read in
               greyscale, and this is the one list the player scans fastest. -->
          <i class="sign" class:down={c.delta < 0} aria-hidden="true">{c.delta > 0 ? '▲' : '▼'}</i>
          <span class="who">{c.name}</span>
          <span class="what">{ATTRIBUTE_LABEL[c.attribute as Attribute] ?? c.attribute}</span>
          <span class="num tabular">{c.delta > 0 ? '+' : ''}{c.delta}</span>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<Panel title="Einzeltraining" accent="accent" meta="Saison {game.meta.season}">
  <p class="hint">
    Ein eigener Schwerpunkt entwickelt deutlich schneller als der Mannschaftsschwerpunkt —
    aber nur in einer Eigenschaft. Antippen ändert den Schwerpunkt.
  </p>
  <ul class="cards">
    {#each squad.players as p (p.id)}
      {@const gained = seasonProgress(t, p.id)}
      <li>
        <!-- docs-check-ignore: opens the focus sheet, documented as a group (training.individual) -->
        <button class="card" onclick={() => show(p)}>
          <span class="who">
            <strong>{p.name}</strong>
            <span class="facts">
              {p.pos} · {p.age} J.
              {#if gained !== 0}
                · <b class="gained" class:down={gained < 0}>{gained > 0 ? '+' : ''}{gained} diese Saison</b>
              {/if}
            </span>
            <span class="meter">
              <em>Fitness</em>
              <Bar value={p.fitness} label="Fitness {p.name}" />
              <b class="tabular">{p.fitness}%</b>
            </span>
          </span>
          <span class="focus" class:own={p.individualFocus !== 'allgemein'}>
            {p.individualFocus === 'allgemein'
              ? `Mannschaft (${FOCUS_LABEL[t.teamFocus]})`
              : FOCUS_LABEL[focusOf(p, t) as Focus]}
          </span>
          <span class="go" aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ul>
</Panel>

{#if picked}
  {@const p = picked}
  <Sheet bind:open title="Schwerpunkt — {p.name}">
    <p class="hint">
      Ein eigener Schwerpunkt entwickelt schneller, aber nur in dieser einen Eigenschaft.
    </p>
    <div class="options">
      {#each FOCUS as f (f)}
        <!-- docs-check-ignore: documented as a group (training.individual) -->
        <button type="button" class="option" class:on={p.individualFocus === f}
                aria-pressed={p.individualFocus === f}
                onclick={() => setFocus(p, f)}>
          <strong>{f === 'allgemein' ? `Mannschaft (${FOCUS_LABEL[t.teamFocus]})` : FOCUS_LABEL[f]}</strong>
          {#if f === 'allgemein'}<small>Folgt dem Mannschaftsschwerpunkt, auch wenn der wechselt.</small>{/if}
        </button>
      {/each}
    </div>
  </Sheet>
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .dim { color: var(--text-dim); font-size: var(--fs-caption); }
  .hint { color: var(--text-muted); font-size: var(--fs-caption); margin-bottom: var(--s3); }

  fieldset { border: 0; margin: 0 0 var(--s4); padding: 0; }
  fieldset:last-child { margin-bottom: 0; }
  legend { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }

  .picks {
    display: flex; flex-wrap: wrap; gap: var(--s2);
  }
  .chip {
    flex: 0 0 auto; min-height: var(--tap); padding: 0 var(--s3);
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-lg); color: var(--text-muted);
    font: inherit; font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
  }
  .chip.on { background: var(--primary); border-color: var(--primary); color: var(--on-fill); }
  .chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .blurb { margin: var(--s2) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .movers { list-style: none; margin: 0; padding: 0; }
  .movers li {
    display: flex; align-items: center; gap: var(--s2);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border);
    font-size: var(--fs-body);
  }
  .movers li:last-child { border-bottom: 0; }
  .sign { color: var(--pos-ink); flex: none; }
  .sign.down { color: var(--neg-ink); }
  .movers .who { flex: 1; color: var(--text-main); }
  .movers .what { color: var(--text-muted); font-size: var(--fs-caption); }
  .movers .num { color: var(--text-main); font-family: var(--font-num); flex: none; min-width: 2.5ch; text-align: right; }

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
  .gained { color: var(--pos-ink); font-weight: 700; }
  .gained.down { color: var(--neg-ink); }
  .go { flex: none; color: var(--text-dim); font-size: var(--fs-title); }

  /* The current focus reads as a tag on the card, at full contrast when it
     is a deliberate choice and dimmed when the player just runs with the
     team — the set-and-forgotten case should look like one. */
  .focus {
    flex: none; max-width: 38%;
    font-size: var(--fs-caption); color: var(--text-dim);
    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .focus.own { color: var(--primary-ink); font-weight: 700; }

  .meter {
    display: grid; grid-template-columns: 3.6rem 1fr auto; gap: var(--s2);
    align-items: center; font-size: var(--fs-caption);
  }
  .meter em { font-style: normal; color: var(--text-dim); }
  .meter b { color: var(--text-main); min-width: 3.2rem; text-align: right; }

  .options { display: grid; gap: var(--s2); }
  .option {
    display: grid; gap: 2px; width: 100%; text-align: left; cursor: pointer;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: var(--s2) var(--s3);
    color: var(--text-main); font: inherit; min-height: var(--tap);
  }
  .option.on { border-color: var(--primary-ink); background: var(--primary-glow); }
  .option:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .option strong { font-size: var(--fs-body); }
  .option small { color: var(--text-muted); font-size: var(--fs-caption); }

  .tabular { font-variant-numeric: tabular-nums; }
</style>
