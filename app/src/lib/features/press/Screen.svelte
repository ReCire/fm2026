<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Bar } from '$lib/ui';
  import { formatMoney } from '../finance/module';
  import { bands, copy, WEIGHTED, INVESTIGATION_FROM } from './content';
  import { bandOf, raidChance } from './rules';
  import type { Story } from './state';

  /**
   * Presse — one meter, its reasons, and what the Verband did about it.
   *
   * The screen exists to answer one question: WHY did the needle move. A gauge
   * on its own is a mood ring, so every line of the feed carries the number it
   * contributed, and the ones that contributed nothing say so rather than being
   * left ambiguous. A blank where a number could be is read as a number the
   * screen is withholding.
   */

  const press = $derived(game.modules.press);
  const band = $derived(bandOf(press));
  const pct = $derived(Math.round(press.pressure));

  /*
   * The clean state is a STATE, not an absence.
   *
   * Zero pressure with a feed full of football is the correct and most common
   * career, so this screen must read as complete when nothing is wrong. That
   * is the whole reason fifteen of the twenty-eight headlines weigh nothing.
   */
  const exposed = $derived(press.pressure >= INVESTIGATION_FROM);
  const chance = $derived(press.investigation ? Math.round(raidChance(press.pressure) * 100) : 0);

  function when(story: Story): string {
    return `S${story.season + 1} · ST ${story.matchday}`;
  }

  /**
   * What a story did to the meter, as a signed number or an explicit nothing.
   *
   * `·` rather than an empty cell. A defeat that moved nothing has to be
   * visibly weightless, because the point being made is that the Verband does
   * not care that you lost — and an empty column would let a player read that
   * as an omission instead of as the answer.
   */
  function delta(story: Story): string {
    if (story.weight === 0) return '·';
    return story.weight > 0 ? `+${story.weight}` : `${story.weight}`;
  }
</script>

<Panel
  title={copy.gauge}
  accent={band.id === 'razzia' ? 'danger' : band.id === 'sauber' ? 'accent' : 'gold'}
  meta="{band.mark} {band.label}"
>
  <div class="gauge">
    <strong class="value tabular">{pct}<span class="unit"> %</span></strong>
    <p class="means">{band.means}</p>
  </div>

  <Bar
    value={press.pressure}
    max={100}
    tone={band.id === 'razzia' ? 'danger' : 'primary'}
    label={copy.gauge}
  />

  <!-- The four thresholds, printed. A player who is punished at 25 % has to be
       able to see where 25 % was before they crossed it; a gauge whose bands
       are only implied by colour is a rule delivered after the fact. -->
  <ol class="scale">
    {#each [...bands].reverse() as b (b.id)}
      <li class:here={b.id === band.id}>
        <i aria-hidden="true">{b.mark}</i>
        <span class="from tabular">{b.from} %</span>
        <span class="name">{b.label}</span>
      </li>
    {/each}
  </ol>

  <p class="rule">{exposed ? copy.exposed : copy.clean}</p>
</Panel>

{#if press.investigation}
  <Panel title="Akte beim Verband" accent="danger" meta="seit S{press.investigation.openedSeason + 1} · ST {press.investigation.openedMatchday}">
    <div class="chips">
      <StatChip
        label="Razzia-Wahrscheinlichkeit"
        value="{chance} % pro Spieltag"
        tone={chance >= 20 ? 'bad' : 'warn'}
        doc="press.investigation"
      />
      <StatChip
        label="Durchsuchungen"
        value={press.investigation.raids}
        tone={press.investigation.raids > 0 ? 'bad' : 'neutral'}
        doc="press.investigation"
      />
      <StatChip
        label="Strafen gezahlt"
        value={formatMoney(press.finesPaid)}
        tone={press.finesPaid > 0 ? 'bad' : 'neutral'}
        doc="press.pressure"
      />
    </div>
    <p class="rule">
      Die Akte schließt sich wieder, sobald der Zeiger unter {INVESTIGATION_FROM} % fällt.
    </p>
  </Panel>
{:else if press.finesPaid > 0}
  <!-- Closed, and the record stays. A club that has been raided and come back
       clean is not the same club as one that never was, and the screen should
       not pretend otherwise the moment the file shuts. -->
  <Panel title="Akte geschlossen" accent="accent">
    <StatChip label="Strafen gezahlt" value={formatMoney(press.finesPaid)} doc="press.pressure" />
  </Panel>
{/if}

<Panel title={copy.feed} accent="primary" meta={press.feed.length > 0 ? `${press.feed.length} Meldungen` : undefined}>
  {#if press.feed.length === 0}
    <p class="empty">{copy.empty}</p>
  {:else}
    <ul class="feed">
      {#each press.feed as story, i (`${story.season}-${story.matchday}-${i}`)}
        <li class="story" class:weighted={WEIGHTED.has(story.cause)}>
          <span class="delta tabular" class:up={story.weight > 0} class:down={story.weight < 0}>
            {delta(story)}
          </span>
          <div class="body">
            <p class="text">{story.text}</p>
            <p class="by">{story.outlet} · {when(story)}</p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .gauge { display: grid; gap: var(--s1); margin-bottom: var(--s2); }
  .value { font-size: 2.6rem; line-height: 1; color: var(--text-main); }
  .value .unit { font-size: var(--fs-body); color: var(--text-muted); }
  .means { font-size: var(--fs-caption); color: var(--text-muted); margin: 0; }

  /* The scale is a list of facts, not a legend: each row is a threshold the
     player can be held to, so the number sits next to the word. */
  .scale {
    list-style: none;
    display: grid;
    gap: 2px;
    margin: var(--s2) 0 0;
    padding: 0;
    font-size: var(--fs-caption);
  }
  .scale li {
    display: grid;
    grid-template-columns: 1.6rem 3.2rem 1fr;
    align-items: baseline;
    gap: var(--s1);
    padding: 2px var(--s1);
    border-radius: var(--r-sm);
    color: var(--text-muted);
  }
  /* Current band: a border and a weight change as well as a ground, so the
     "you are here" survives greyscale. */
  .scale li.here {
    background: var(--bg-inset);
    color: var(--text-main);
    font-weight: 600;
    box-shadow: inset 2px 0 0 var(--primary);
  }
  .scale .from { text-align: right; }

  .rule {
    margin: var(--s2) 0 0;
    font-size: var(--fs-caption);
    color: var(--text-muted);
  }

  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; margin: 0; }

  .feed { list-style: none; display: grid; gap: var(--s1); margin: 0; padding: 0; }
  .story {
    display: grid;
    grid-template-columns: 2.8rem 1fr;
    gap: var(--s2);
    align-items: start;
    padding: var(--s2) var(--s1);
    border-radius: var(--r-sm);
    border-left: 3px solid transparent;
  }
  /* Weight is carried by the printed number first. The rail is a second,
     redundant channel — never the only one. */
  .story.weighted { background: var(--bg-inset); border-left-color: var(--border-strong); }
  .delta {
    text-align: right;
    font-size: var(--fs-caption);
    color: var(--text-muted);
    padding-top: 2px;
  }
  .delta.up { color: var(--danger-ink); font-weight: 700; }
  .delta.down { color: var(--primary-ink); font-weight: 700; }

  .body { display: grid; gap: 2px; min-width: 0; }
  .text { margin: 0; font-size: var(--fs-body); color: var(--text-main); }
  .by { margin: 0; font-size: var(--fs-caption); color: var(--text-muted); }
</style>
