<script lang="ts">
  import { Button } from '$lib/ui';
  import { celebrate, isMoment, type ReviewFacts } from './celebration';

  /**
   * The end of a season, at the volume it earned.
   *
   * A PROP-driven component, not a state-reading one, and deliberately so: the
   * outcomes worth designing for — a playoff survived, a first European place,
   * a title — are the ones a live save reaches once a decade. Taking facts as
   * props means every one of them can be rendered on demand, by a test, by a
   * story, or by hand, instead of waiting on a career that happens to produce
   * it. It also means this file did not have to wait for `league.review`.
   *
   * `celebrate()` decides what and how loud. Nothing here re-decides it.
   */

  let {
    facts,
    record,
    playoff,
    boardLine,
    onclose
  }: {
    facts: ReviewFacts;
    /** The line in the table, for the small print under the headline. */
    record?: {
      points: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    /** Both legs, when there were both legs. */
    playoff?: {
      opponent: string;
      legs: { homeGoals: number; awayGoals: number }[];
      aggregate: [number, number];
      /**
       * Decided in a shoot-out rather than over the two legs.
       *
       * The only place in the game where that distinction exists, and it is the
       * difference between two memories of the same result — so it is printed
       * next to the aggregate rather than left for the player to infer from a
       * level score.
       */
      onPenalties?: boolean;
    };
    /** What the boardroom made of it. Optional — most seasons it says nothing. */
    boardLine?: string;
    onclose?: () => void;
  } = $props();

  const c = $derived(celebrate(facts));
  const big = $derived(isMoment(c));
</script>

<!-- The tone drives the treatment, the volume drives the size. They are set on
     the element as data attributes rather than as classes composed in script,
     so every combination is inspectable in the DOM and none of them is a token
     name built at runtime. -->
<section class="review" data-tone={c.tone} data-volume={c.volume}>
  <p class="eyebrow">Saison {facts.rank > 0 ? 'abgeschlossen' : 'beendet'}</p>

  {#if big}
    <h2 class="headline">{c.headline}</h2>
  {:else}
    <h2 class="headline quiet">{c.headline}</h2>
  {/if}

  <p class="line">{c.line}</p>

  {#if record}
    <dl class="record">
      <div><dt>Platz</dt><dd class="tabular">{facts.rank}</dd></div>
      <div><dt>Punkte</dt><dd class="tabular">{record.points}</dd></div>
      <div><dt>Bilanz</dt><dd class="tabular">{record.won}–{record.drawn}–{record.lost}</dd></div>
      <div>
        <dt>Tore</dt>
        <dd class="tabular">{record.goalsFor}:{record.goalsAgainst}</dd>
      </div>
    </dl>
  {/if}

  {#if playoff}
    <!-- Two legs and an aggregate is a story with a shape, so it gets drawn as
         one rather than folded into a sentence. Surviving a tie as the higher
         side and winning one as the challenger are both relief; only one of
         them is a promotion, and the aggregate is where a player reads which. -->
    <div class="playoff">
      <p class="ptitle">Relegation gegen {playoff.opponent}</p>
      <ol class="legs">
        {#each playoff.legs as leg, i (i)}
          <li>
            <span>{i === 0 ? 'Hinspiel' : 'Rückspiel'}</span>
            <strong class="tabular">{leg.homeGoals} : {leg.awayGoals}</strong>
          </li>
        {/each}
        <li class="agg">
          <span>Gesamt{playoff.onPenalties ? ' — im Elfmeterschiessen' : ''}</span>
          <strong class="tabular">
            {playoff.aggregate[0]} : {playoff.aggregate[1]}{playoff.onPenalties ? ' n. E.' : ''}
          </strong>
        </li>
      </ol>
    </div>
  {/if}

  {#if boardLine}
    <blockquote class="board"><p>„{boardLine}"</p></blockquote>
  {/if}

  {#if onclose}
    <div class="actions">
      <Button doc="league.season" label="Weiter" onclick={onclose} />
    </div>
  {/if}
</section>

<style>
  .review {
    display: grid;
    gap: var(--s2);
    padding: var(--s3);
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-card);
    text-align: center;
  }
  /* Volume is size and room. Tone is colour and weight. They are set
     independently because relegation needs all of the first and none of the
     second — collapsed into one scale, the screen either celebrates a
     relegation or whispers it. */
  .review[data-volume='3'] { padding: var(--s2); border-width: 2px; }
  .review[data-volume='0'] { text-align: left; gap: var(--s1); }

  .review[data-tone='triumph'] { border-color: var(--gold); background: var(--bg-inset); }
  .review[data-tone='freude'] { border-color: var(--primary); }
  .review[data-tone='erleichterung'] { border-color: var(--accent); }
  .review[data-tone='bitter'] { border-color: var(--danger); }

  .eyebrow {
    margin: 0;
    font-size: var(--fs-caption);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .headline {
    margin: 0;
    line-height: var(--lh-tight);
    font-size: var(--fs-display);
    color: var(--text-main);
  }
  .review[data-tone='triumph'] .headline { color: var(--gold-ink); }
  .review[data-tone='bitter'] .headline { color: var(--danger-ink); }
  /* Mid-table. A heading, not an announcement. */
  .headline.quiet { font-size: var(--fs-title); }
  .review[data-volume='0'] .headline { font-size: var(--fs-headline); }

  .line { margin: 0; color: var(--text-muted); font-size: var(--fs-body); }

  .record {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s1);
    margin: 0;
    padding: var(--s2) 0 0;
    border-top: 1px solid var(--border);
  }
  .record div { display: grid; gap: 2px; }
  .record dt { font-size: var(--fs-caption); color: var(--text-muted); }
  .record dd { margin: 0; font-weight: 700; color: var(--text-main); }

  .playoff {
    padding: var(--s2);
    border-radius: var(--r-sm);
    background: var(--bg-inset);
    text-align: left;
  }
  .ptitle { margin: 0 0 var(--s1); font-size: var(--fs-caption); color: var(--text-muted); }
  .legs { list-style: none; display: grid; gap: 2px; margin: 0; padding: 0; }
  .legs li { display: flex; justify-content: space-between; gap: var(--s2); font-size: var(--fs-caption); }
  .legs li.agg {
    margin-top: 2px;
    padding-top: 4px;
    border-top: 1px solid var(--border-strong);
    font-weight: 700;
    color: var(--text-main);
  }

  .board {
    margin: 0;
    padding: var(--s1) var(--s2);
    border-left: 3px solid var(--border-strong);
    text-align: left;
  }
  .board p { margin: 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .actions { display: flex; justify-content: center; }

  /* The one flourish, and only at full volume. A title should arrive rather
     than appear — but a player who has asked the system not to animate has
     asked for a reason, and a season review is not the place to overrule it. */
  @media (prefers-reduced-motion: no-preference) {
    .review[data-volume='3'] .headline {
      animation: arrive 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
  }
  @keyframes arrive {
    from { opacity: 0; transform: scale(0.94); }
    to { opacity: 1; transform: none; }
  }
</style>
