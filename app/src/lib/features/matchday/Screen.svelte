<script lang="ts">
  /** Structure only. Visual language belongs to the Creative Director. */
  import { game, registry } from '$lib/state/game.svelte';
  import { previewPre } from '$lib/engine/clock';
  import { currentStep, takeStep } from '$lib/shell';
  import LiveMatch from './LiveMatch.svelte';
  import { dismiss, skipToEnd, atInterval } from '$lib/state/live.svelte';
  import { teamById } from '../league/rules';
  import { Panel, Button, StatChip, Bar, fromEvent, toast } from '$lib/ui';
  import { FORMATIONS, STYLES, TALKS } from './state';
  import {
    modifiers, effectiveStrength, readiness, outcomeOf, scoreline,
    formLetters, describeFormation, describeStyle, describeTalk,
    arrangeSabotage, cancelSabotage
  } from './rules';
  import { sabotages, sabotageById, canArrange, cappedSwing } from './sabotage';
  import { teamStrength, isAvailable } from '../squad/rules';
  import { playerFixture } from '../league/rules';
  import { formatMoney } from '../finance/rules';
  import { save } from '$lib/state/persist.svelte';

  const m = $derived(game.modules.matchday);
  /* Fourteenth by-name club reference. The report printed a hardcoded
     "FC Anstoß Pro" beside the score while the club was SC Ziegelhütte —
     visible in the one panel the player reads most closely. Looked up by id;
     an editor rename is already on the club, so there is nothing to resolve. */
  const clubName = $derived(
    teamById(game.modules.league, game.modules.league.playerClubId)?.name ?? 'Dein Verein'
  );
  const squad = $derived(game.modules.squad);
  const league = $derived(game.modules.league);

  const fixture = $derived(playerFixture(league, game.meta.matchday));
  const isHome = $derived(fixture?.isHome ?? true);
  const base = $derived(teamStrength(squad, false));
  const mods = $derived(modifiers(m, isHome));
  /*
   * The number the SIMULATION will use, not a second guess at it.
   *
   * This chip summed the squad and the tactics and knew nothing about the
   * backroom or the doctrine, so a player who bought a +2 node saw 60 here and
   * watched the match resolve at 62. Two surfaces, two answers, and the wrong
   * one was the one they were looking at.
   *
   * `previewPre` runs the real `pre` hooks over a throwaway copy of the state
   * and reports what they published, so this cannot drift from the tick — it IS
   * the tick, discarded instead of kept.
   */
  const effective = $derived(
    previewPre(registry, game).provided.get('squad.strength') as number
      ?? effectiveStrength(m, base, isHome)
  );

  const available = $derived(squad.players.filter(isAvailable).length);
  const startingFitness = $derived(() => {
    const starters = squad.players.filter((p) => squad.lineup.includes(p.id));
    if (starters.length === 0) return 0;
    return starters.reduce((s, p) => s + p.fitness, 0) / starters.length;
  });
  const state = $derived(readiness(squad.lineup.length, available, startingFitness()));

  /*
   * One button, two steps.
   *
   * The loop decides which — see shell/loop.svelte.ts. Offering "train" and
   * "play" side by side would let the player walk straight past the week, and a
   * week you can skip is not a week; it is a screen with a button on it.
   */
  const step = $derived(currentStep());

  /*
   * A match in progress holds the loop.
   *
   * Without this the button underneath a running match still advanced time,
   * threw the match away mid-watch, and replaced it with the next one — the
   * live view had no weight at all, which is the same complaint that started
   * this in a new costume. Blocked rather than disabled: the control stays in
   * the tab order and says why, because disabling is not an explanation.
   */
  const watching = $derived(!!m.live && m.live.minute < 90);
  /* At the interval the match is not merely running, it is waiting on the
     manager — so the message must not offer a skip that is refused. */
  const interval = $derived(atInterval());

  function play() {
    if (watching) return;
    // A finished match on screen is a report, not a match. Advancing clears it.
    if (m.live) dismiss();
    for (const e of takeStep().events) fromEvent(e);
  }

  /*
   * The other half of Ermittlungsdruck — see sabotage.ts.
   *
   * One arranged thing at a time, same lifecycle as formation/style/talk:
   * chosen here, spent by Saturday, gone whether it was played or not. The
   * options only show while nothing is planned; once one is, the engine
   * would refuse a second anyway, and showing four live buttons that are
   * about to say no is worse than showing the one that is already chosen.
   */
  const finance = $derived(game.modules.finance);
  const plannedSabotage = $derived(m.plannedSabotage ? sabotageById.get(m.plannedSabotage) : null);

  function arrange(id: string) {
    const result = arrangeSabotage(m, finance, game.meta, id);
    if (!result.ok) {
      toast('Nicht möglich', result.reason, 'warn');
      return;
    }
    // The money already left through the ledger inside arrangeSabotage; save
    // now for the same reason a half-time decision does — this happens
    // between ticks, and the autosave only fires on a committed one.
    void save();
  }

  function cancel() {
    cancelSabotage(m);
    void save();
  }
</script>

<LiveMatch {clubName} />

{#if m.lastReport && !m.live}
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

  <!-- The heading says where you are standing; the button says what the step
       is. Both come from the loop, so they cannot disagree. -->
  <p class="step">{step.title}</p>
  {#if watching}
    <p class="held" id="loop-held">
      {#if interval}
        Halbzeit — die zweite Hälfte wartet auf deine Entscheidung.
      {:else}
        Das Spiel läuft noch — {m.live?.minute}. Minute.
        Sieh es zu Ende oder spring zum Abpfiff.
      {/if}
    </p>
    <Button doc={step.doc} blocked describedBy="loop-held"
            onclick={() => { if (!interval) skipToEnd(); }} explain />
  {:else}
    <Button doc={step.doc} onclick={play} explain />
  {/if}
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

<Panel title="Beratung vor dem Spiel" accent={plannedSabotage ? 'danger' : 'accent'}
       meta={plannedSabotage ? 'Arrangiert' : 'Nichts geplant'}>
  {#if plannedSabotage}
    {@const swing = cappedSwing(plannedSabotage)}
    <p class="planned-label"><b>{plannedSabotage.label}</b></p>
    <p class="intro">{plannedSabotage.detail}</p>
    <span class="stats">
      <span class="stat pos"><i class="glyph" aria-hidden="true">▲</i>Stärke +{swing}</span>
      <span class="stat neg"><i class="glyph" aria-hidden="true">▲</i>Ermittlungsdruck +{plannedSabotage.pressureCost}</span>
    </span>
    <p class="warn">Absagen erstattet nichts — das Honorar ist bereits gezahlt.</p>
    <Button doc="matchday.cancelSabotage" variant="secondary" label="Absagen" onclick={cancel} />
  {:else}
    <p class="intro">
      Kostet vor dem Anpfiff, wirkt nur im nächsten Spiel, und erhöht danach den
      Ermittlungsdruck. Höchstens eine Sache gleichzeitig.
    </p>
    <ul class="sabotages">
      {#each sabotages as s (s.id)}
        {@const affordable = canArrange(s, finance.money)}
        <li>
          <!-- docs-check-ignore: documented as a group (matchday.sabotage) -->
          <button type="button" class="row" disabled={!affordable} onclick={() => arrange(s.id)}>
            <b>{s.label}</b>
            <small>{s.detail}</small>
            <span class="stats">
              <span class="stat pos"><i class="glyph" aria-hidden="true">▲</i>Stärke +{cappedSwing(s)}</span>
              <span class="stat neg"><i class="glyph" aria-hidden="true">▲</i>Druck +{s.pressureCost}</span>
              <span class="stat neg tabular"><i class="glyph" aria-hidden="true">▼</i>{formatMoney(s.moneyCost)}</span>
            </span>
            {#if !affordable}<span class="unaffordable">Vereinskonto reicht nicht</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .fixture { margin-bottom: var(--s3); font-size: var(--fs-body); }
  .step { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
  .held { font-size: var(--fs-caption); color: var(--accent-ink); margin-bottom: var(--s2); }

  .outcome {
    display: flex; align-items: center; gap: var(--s2);
    font-size: var(--fs-title); font-weight: 800; color: var(--text-main);
    margin-bottom: var(--s2);
  }
  /* The scorecard: two names either side of one large tabular figure, the
     way a printed result reads. A single ruleset — this used to be two,
     the second silently overriding the first's centring with a
     space-between layout nobody had asked for. */
  .score {
    display: flex; align-items: center; justify-content: center; gap: var(--s3);
    margin-bottom: var(--s2);
  }
  .score .side {
    flex: 1; min-width: 0;
    font-size: var(--fs-body); font-weight: 700; color: var(--text-muted);
    line-height: var(--lh-tight); text-align: center;
  }
  .score .figure {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-display); font-weight: 800; color: var(--text-main);
    flex: none; letter-spacing: -0.02em;
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

  .intro { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s3); }
  .planned-label { font-size: var(--fs-body); margin-bottom: var(--s1); }
  .warn { font-size: var(--fs-caption); color: var(--neg-ink); margin: var(--s2) 0 var(--s3); }

  .sabotages { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s2); }
  .sabotages .row {
    display: block; width: 100%; text-align: left; cursor: pointer;
    padding: var(--s2) var(--s3); min-height: var(--tap);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); font: inherit;
  }
  .sabotages .row:not(:disabled):hover { border-color: var(--primary-ink); }
  .sabotages .row:disabled { opacity: 0.55; cursor: not-allowed; }
  .sabotages b { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .sabotages small { display: block; color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-tight); margin-bottom: var(--s2); }
  .unaffordable { display: block; margin-top: var(--s1); font-size: var(--fs-caption); color: var(--neg-ink); }

  /* Same glyph-plus-word trade badges as the half-time panel — the trade
     being visible is the point in both places, so the treatment matches. */
  .stats { display: flex; flex-wrap: wrap; gap: var(--s1); }
  .stat {
    display: inline-flex; align-items: center;
    padding: 1px 6px; border-radius: 999px;
    background: var(--bg-sunken);
    font-size: var(--fs-caption); font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stat .glyph { margin-right: 3px; }
  .stat.pos { color: var(--pos-ink); }
  .stat.neg { color: var(--neg-ink); }
</style>
