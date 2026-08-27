<script lang="ts">
  /** Structure only. Visual language belongs to the Creative Director. */
  import { game, advance } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, fromEvent } from '$lib/ui';
  import { FORMATIONS, STYLES, TALKS } from './state';
  import {
    modifiers, effectiveStrength, readiness, outcomeOf, scoreline,
    formLetters, describeFormation, describeStyle, describeTalk
  } from './rules';
  import { teamStrength, isAvailable } from '../squad/rules';
  import { playerFixture } from '../league/rules';

  const m = $derived(game.modules.matchday);
  const squad = $derived(game.modules.squad);
  const league = $derived(game.modules.league);

  const fixture = $derived(playerFixture(league, game.meta.matchday));
  const isHome = $derived(fixture?.isHome ?? true);
  const base = $derived(teamStrength(squad, false));
  const mods = $derived(modifiers(m, isHome));
  const effective = $derived(effectiveStrength(m, base, isHome));

  const available = $derived(squad.players.filter(isAvailable).length);
  const startingFitness = $derived(() => {
    const starters = squad.players.filter((p) => squad.lineup.includes(p.id));
    if (starters.length === 0) return 0;
    return starters.reduce((s, p) => s + p.fitness, 0) / starters.length;
  });
  const state = $derived(readiness(squad.lineup.length, available, startingFitness()));

  function play() {
    for (const e of advance('matchday').events) fromEvent(e);
  }
</script>

<Panel title="Nächstes Spiel" accent="accent" meta="Spieltag {game.meta.matchday}">
  {#if fixture}
    <p class="fixture">
      <strong>{isHome ? 'Heim' : 'Auswärts'}</strong> gegen
      <strong>{fixture.opponent}</strong>
      <span class="dim">· Stärke {fixture.opponentStrength}</span>
    </p>
  {:else}
    <p class="dim">Spielfrei.</p>
  {/if}

  <div class="chips">
    <StatChip label="Unsere Stärke" value={effective} doc="matchday.opponent"
              tone={mods.total > 0 ? 'good' : mods.total < 0 ? 'bad' : 'neutral'} />
    <StatChip label="Kader-Basis" value={base} doc="squad.strength" />
    <StatChip label="Einsatzbereit" value="{available} / {squad.players.length}" doc="matchday.readiness"
              tone={available < 11 ? 'bad' : 'neutral'} />
    <StatChip label="Form" value={formLetters(m) || '—'} doc="matchday.form" />
  </div>

  {#if !state.ready}
    <ul class="problems">
      {#each state.problems as p (p)}<li>{p}</li>{/each}
    </ul>
  {/if}

  <Button doc="game.advance" onclick={play} explain />
</Panel>

<Panel title="Aufstellung &amp; Ansprache" accent="primary" meta="{mods.total >= 0 ? '+' : ''}{mods.total}">
  <fieldset>
    <legend>Grundordnung</legend>
    {#each FORMATIONS as f (f)}
      <label class="opt" class:on={m.formation === f}>
        <!-- docs-check-ignore: documented as a group (matchday.formation) -->
        <input type="radio" name="formation" value={f} bind:group={m.formation} />
        <span><b>{f}</b><small>{describeFormation(f)}</small></span>
      </label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>Spielweise</legend>
    {#each STYLES as st (st)}
      <label class="opt" class:on={m.style === st}>
        <!-- docs-check-ignore: documented as a group (matchday.style) -->
        <input type="radio" name="style" value={st} bind:group={m.style} />
        <span><b>{st}</b><small>{describeStyle(st)}</small></span>
      </label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>Ansprache</legend>
    {#each TALKS as t (t)}
      <label class="opt" class:on={m.talk === t}>
        <!-- docs-check-ignore: documented as a group (matchday.talk) -->
        <input type="radio" name="talk" value={t} bind:group={m.talk} />
        <span><b>{t}</b><small>{describeTalk(t)}</small></span>
      </label>
    {/each}
  </fieldset>
</Panel>

{#if m.lastReport}
  {@const r = m.lastReport}
  <Panel title="Spielbericht" accent={outcomeOf(r) === 'win' ? 'primary' : outcomeOf(r) === 'loss' ? 'danger' : 'accent'}
         meta="Spieltag {r.matchday}">
    <p class="score">
      <span>{r.isHome ? 'FC Anstoß Pro' : r.opponent}</span>
      <strong class="tabular">{r.isHome ? scoreline(r) : `${r.goalsAgainst}:${r.goalsFor}`}</strong>
      <span>{r.isHome ? r.opponent : 'FC Anstoß Pro'}</span>
    </p>
    <div class="chips">
      <StatChip label="Unsere Stärke" value={r.ourStrength} doc="matchday.report" />
      <StatChip label="Gegner" value={r.opponentStrength} doc="matchday.opponent" />
    </div>
  </Panel>
{/if}

<style>
  .fixture { margin-bottom: var(--s3); font-size: var(--fs-body); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .problems { list-style: none; margin: 0 0 var(--s3); padding: 0; }
  .problems li { color: var(--accent); font-size: var(--fs-caption); padding: 2px 0; }

  fieldset { border: 0; margin: 0 0 var(--s4); padding: 0; }
  legend { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
  .opt {
    display: block; padding: var(--s2) var(--s3); margin-bottom: var(--s1);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); cursor: pointer; min-height: var(--tap);
  }
  .opt.on { border-color: var(--primary); background: var(--primary-glow); }
  .opt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .opt input:focus-visible ~ span { outline: 2px solid var(--primary); outline-offset: 3px; }
  .opt b { display: block; font-size: var(--fs-body); text-transform: capitalize; }
  .opt small { color: var(--text-muted); font-size: var(--fs-caption); }

  .score { display: flex; align-items: center; justify-content: space-between; gap: var(--s3); margin-bottom: var(--s3); }
  .score strong { font-size: var(--fs-display); }
  .score span { flex: 1; font-size: var(--fs-caption); color: var(--text-muted); }
  .score span:last-child { text-align: right; }
</style>
