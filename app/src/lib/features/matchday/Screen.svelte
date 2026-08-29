<script lang="ts">
  /** Structure only. Visual language belongs to the Creative Director. */
  import { game, advance } from '$lib/state/game.svelte';
  import { teamById } from '../league/rules';
  import { resolveClub } from '../editor/rules';
  import { Panel, Button, StatChip, Bar, fromEvent } from '$lib/ui';
  import { FORMATIONS, STYLES, TALKS } from './state';
  import {
    modifiers, effectiveStrength, readiness, outcomeOf, scoreline,
    formLetters, describeFormation, describeStyle, describeTalk
  } from './rules';
  import { teamStrength, isAvailable } from '../squad/rules';
  import { playerFixture } from '../league/rules';

  const m = $derived(game.modules.matchday);
  /* Fourteenth by-name club reference. The report printed a hardcoded
     "FC Anstoß Pro" beside the score while the club was SC Ziegelhütte —
     visible in the one panel the player reads most closely. */
  const clubName = $derived(
    (() => {
      const t = teamById(game.modules.league, game.modules.league.playerClubId);
      return t ? resolveClub(game.modules.editor, {
        id: t.id, name: t.name, short: '', city: '', colours: ['#000000', '#ffffff'] as const
      }).name : 'Dein Verein';
    })()
  );
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

{#if m.lastReport}
  {@const r = m.lastReport}
  {@const o = outcomeOf(r)}
  <!-- Above the next fixture, deliberately. The result you just produced
       outranks a decision you have not made yet — it was previously third in
       the order, 1296px down an 812px screen, so you scrolled past the setup
       for the NEXT match to find out how the last one went. Nobody scrolls to
       find out if they won. -->
  <Panel title="Spielbericht" accent={o === 'win' ? 'primary' : o === 'loss' ? 'danger' : 'accent'}
         meta="Spieltag {r.matchday}">
    <p class="outcome">
      <!-- Glyph and word, not colour: a result must read in greyscale, and it
           is the one thing on the screen nobody should have to decode. -->
      <i class="glyph" aria-hidden="true">{o === 'win' ? '▲' : o === 'loss' ? '▼' : '■'}</i>
      {o === 'win' ? 'Sieg' : o === 'loss' ? 'Niederlage' : 'Unentschieden'}
    </p>
    <p class="score">
      <span class="side">{r.isHome ? clubName : r.opponent}</span>
      <strong class="figure">{r.isHome ? scoreline(r) : `${r.goalsAgainst}:${r.goalsFor}`}</strong>
      <span class="side">{r.isHome ? r.opponent : clubName}</span>
    </p>
    <p class="where">{r.isHome ? 'Heimspiel' : 'Auswärts'} · Stärke {r.ourStrength} gegen {r.opponentStrength}</p>
  </Panel>
{/if}

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

<style>
  .fixture { margin-bottom: var(--s3); font-size: var(--fs-body); }

  .outcome {
    display: flex; align-items: center; gap: var(--s2);
    font-size: var(--fs-title); font-weight: 800; color: var(--text-main);
    margin-bottom: var(--s2);
  }
  .score {
    display: flex; align-items: center; justify-content: center; gap: var(--s3);
    text-align: center; margin-bottom: var(--s2);
  }
  .score .side { flex: 1; font-size: var(--fs-body); color: var(--text-muted); line-height: var(--lh-tight); }
  .score .figure {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-display); font-weight: 800; color: var(--text-main);
    flex: none;
  }
  .where { font-size: var(--fs-caption); color: var(--text-dim); text-align: center; }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .problems { list-style: none; margin: 0 0 var(--s3); padding: 0; }
  .problems li { color: var(--accent-ink); font-size: var(--fs-caption); padding: 2px 0; }

  fieldset { border: 0; margin: 0 0 var(--s4); padding: 0; }
  legend { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
  .opt {
    display: block; padding: var(--s2) var(--s3); margin-bottom: var(--s1);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); cursor: pointer; min-height: var(--tap);
  }
  .opt.on { border-color: var(--primary-ink); background: var(--primary-glow); }
  .opt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .opt input:focus-visible ~ span { outline: 2px solid var(--primary); outline-offset: 3px; }
  .opt b { display: block; font-size: var(--fs-body); text-transform: capitalize; }
  .opt small { color: var(--text-muted); font-size: var(--fs-caption); }

  .score { display: flex; align-items: center; justify-content: space-between; gap: var(--s3); margin-bottom: var(--s3); }
  .score strong { font-size: var(--fs-display); }
  .score span { flex: 1; font-size: var(--fs-caption); color: var(--text-muted); }
  .score span:last-child { text-align: right; }
</style>
