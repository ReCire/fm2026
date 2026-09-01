<script lang="ts">
  import { game, advance } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, fromEvent } from '$lib/ui';
  import { FOCUS, FOCUS_LABEL, ATTRIBUTE_LABEL, type Focus, type Attribute } from '../squad/attributes';
  import { INTENSITIES } from './state';
  import { INTENSITY_LABEL, INTENSITY_BLURB } from './content';
  import { restFor, seasonProgress, focusOf } from './rules';
  import { isAvailable } from '../squad/rules';

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
    <div class="grid">
      {#each FOCUS as f (f)}
        <label class="opt" class:on={t.teamFocus === f}>
          <!-- docs-check-ignore: documented as a group (training.teamFocus) -->
          <input type="radio" name="teamFocus" value={f} bind:group={t.teamFocus} />
          <span>{FOCUS_LABEL[f]}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Intensität</legend>
    {#each INTENSITIES as i (i)}
      <label class="opt wide" class:on={t.intensity === i}>
        <!-- docs-check-ignore: documented as a group (training.intensity) -->
        <input type="radio" name="intensity" value={i} bind:group={t.intensity} />
        <span><b>{INTENSITY_LABEL[i]}</b><small>{INTENSITY_BLURB[i]}</small></span>
      </label>
    {/each}
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
    aber nur in einer Eigenschaft.
  </p>
  <ul class="players">
    {#each squad.players as p (p.id)}
      {@const gained = seasonProgress(t, p.id)}
      <li>
        <div class="head">
          <span class="pos">{p.pos}</span>
          <span class="who">{p.name}</span>
          <span class="age">{p.age} J.</span>
          {#if gained !== 0}
            <span class="gained tabular" class:down={gained < 0}>{gained > 0 ? '+' : ''}{gained}</span>
          {/if}
        </div>
        <Bar value={p.fitness} max={100} label="Fitness" showValue />
        <label class="pick">
          <span class="lbl">Schwerpunkt</span>
          <!-- docs-check-ignore: documented as a group (training.individual) -->
          <select bind:value={p.individualFocus}>
            {#each FOCUS as f (f)}
              <option value={f}>{f === 'allgemein' ? `Mannschaft (${FOCUS_LABEL[t.teamFocus]})` : FOCUS_LABEL[f]}</option>
            {/each}
          </select>
          <span class="now">→ {FOCUS_LABEL[focusOf(p, t) as Focus]}</span>
        </label>
      </li>
    {/each}
  </ul>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .dim { color: var(--text-dim); font-size: var(--fs-caption); }
  .hint { color: var(--text-muted); font-size: var(--fs-caption); margin-bottom: var(--s3); }

  fieldset { border: 0; margin: 0 0 var(--s4); padding: 0; }
  legend { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: var(--s1); }
  .opt {
    display: block; padding: var(--s2) var(--s3); margin-bottom: var(--s1);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); cursor: pointer; min-height: var(--tap);
    font-size: var(--fs-body);
  }
  .opt.wide { display: block; }
  .opt.on { border-color: var(--primary-ink); background: var(--primary-glow); }
  .opt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .opt input:focus-visible ~ span { outline: 2px solid var(--primary); outline-offset: 3px; }
  .opt b { display: block; font-size: var(--fs-body); }
  .opt small { color: var(--text-muted); font-size: var(--fs-caption); }

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

  .players { list-style: none; margin: 0; padding: 0; }
  .players li { padding: var(--s3) 0; border-bottom: 1px solid var(--border); }
  .players li:last-child { border-bottom: 0; }
  .head { display: flex; align-items: baseline; gap: var(--s2); margin-bottom: var(--s2); }
  .pos {
    flex: none; font-size: var(--fs-caption); color: var(--accent-ink);
    background: var(--bg-inset); border-radius: var(--r-sm); padding: 1px var(--s2);
  }
  /* min-width: 0 so a long name truncates instead of pushing the numbers off
     a phone screen — a flex child refuses to shrink below its content without it. */
  .head .who { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--fs-body); color: var(--text-main); }
  .age { font-size: var(--fs-caption); color: var(--text-dim); }
  .gained { font-family: var(--font-num); font-size: var(--fs-caption); color: var(--pos-ink); }
  .gained.down { color: var(--neg-ink); }

  .pick { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); flex-wrap: wrap; }
  .pick .lbl { font-size: var(--fs-caption); color: var(--text-muted); }
  .pick select {
    min-height: var(--tap); font: inherit; font-size: var(--fs-caption);
    color: var(--text-main); background: var(--bg-inset);
    border: 1px solid var(--border); border-radius: var(--r-sm); padding: 0 var(--s2);
  }
  .pick .now { font-size: var(--fs-caption); color: var(--text-dim); }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
