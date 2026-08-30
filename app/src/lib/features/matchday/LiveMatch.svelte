<script lang="ts">
  import { untrack } from 'svelte';
  import { game } from '$lib/state/game.svelte';
  import { Button } from '$lib/ui';
  import { start, pause, release, skipToEnd, dismiss, atInterval } from '$lib/state/live.svelte';
  import { pendingDecision, applyHalfTime } from './halftime';
  import { save } from '$lib/state/persist.svelte';
  import { beatsUpTo, scoreAt, type Beat, type BeatKind } from './narrate';

  let { clubName }: { clubName: string } = $props();

  const live = $derived(game.modules.matchday.live);
  const minute = $derived(live?.minute ?? 0);
  /* Newest first. The beat that just arrived is the one being read; a feed
     that appends downward asks the player to chase it.

     Carrying the index because it is the only guaranteed-unique key: two
     fillers can legitimately land on the same minute with the same text, and
     a `minute + kind + text` key crashed the whole feed with
     `each_key_duplicate` when they did. */
  const shown = $derived(
    live ? beatsUpTo(live.beats, minute).map((beat, i) => ({ beat, i })).reverse() : []
  );
  const score = $derived<[number, number]>(live ? scoreAt(live.beats, minute) : [0, 0]);
  const finished = $derived(minute >= 90);
  /* Recomputed from state, not stored: the question IS the scoreboard at 45,
     and a stored copy could disagree with the beats it was built from. */
  const decision = $derived(live ? pendingDecision(game) : null);
  const waiting = $derived(!!decision && atInterval());

  function decide(id: string) {
    const chosen = applyHalfTime(game, id);
    if (!chosen) return;
    /*
     * Save immediately.
     *
     * The autosave fires on a committed TICK, and a half-time decision is not
     * one — it happens between the matchday tick and the next. Without this,
     * reloading during the second half restored the pre-decision save: the
     * table went back to the old scoreline while the match on screen had ended
     * on the new one. Found by reloading mid-match and watching the two
     * disagree.
     */
    void save();
    start();
  }

  const home = $derived(live?.isHome ? clubName : (live?.opponent ?? ''));
  const away = $derived(live?.isHome ? (live?.opponent ?? '') : clubName);
  const shownScore = $derived<[number, number]>(live?.isHome ? score : [score[1], score[0]]);

  /*
   * Autoplay on arrival.
   *
   * The complaint that started all of this was that the match did not run
   * without a button being pressed. A live view whose first act is to ask for
   * a click is the same complaint with more steps.
   *
   * `untrack` is load-bearing. The clock advances `minute` and `running`; if
   * this effect READ them it would re-run on every tick, tear down its own
   * timer through the cleanup, and stop the match one second after kickoff —
   * which is exactly what it did. The only dependency is whether a match
   * exists at all.
   */
  $effect(() => {
    const match = game.modules.matchday.live;
    if (!match) return;
    untrack(() => {
      if (match.running && match.minute < 90) start();
    });
    return () => release();
  });

  const GLYPH: Record<BeatKind, string> = {
    kickoff: '○', goal: '⚽', chance: '↗', save: '✋', foul: '✕',
    card: '▮', injury: '✚', halftime: '⏸', fulltime: '⏹'
  };

  function toneOf(b: Beat): 'ours' | 'theirs' | 'neutral' {
    if (b.kind === 'kickoff' || b.kind === 'halftime' || b.kind === 'fulltime') return 'neutral';
    return b.ours ? 'ours' : 'theirs';
  }
</script>

{#if live}
  <section class="live" class:done={finished}>
    <header>
      <div class="clock">
        <!-- The minute is the only thing on screen that is moving, so it is the
             only thing that gets the live mark. -->
        {#if !finished}<i class="dot" aria-label="läuft"></i>{/if}
        <span class="min tabular">{minute}'</span>
      </div>
      <div class="board">
        <span class="team">{home}</span>
        <strong class="figure tabular">{shownScore[0]}:{shownScore[1]}</strong>
        <span class="team right">{away}</span>
      </div>
    </header>

    {#if waiting && decision}
      <!-- The question sits above the controls and replaces them, because at
           the interval there is exactly one thing to do. -->
      <div class="ask">
        <p class="q">{decision.question}</p>
        <ul class="opts">
          {#each decision.options as o (o.id)}
            <li>
              <!-- The options are data, so their text cannot come from the
                   registry the way a fixed control's does. -->
              <!-- docs-check-ignore: documented as a group (matchday.halftime) -->
              <button type="button" class="opt" onclick={() => decide(o.id)}>
                <b>{o.label}</b>
                <small>{o.detail}</small>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="controls" class:hidden={waiting}>
      {#if finished}
        <Button doc="matchday.dismiss" variant="secondary" onclick={dismiss} />
      {:else if live.running}
        <Button doc="matchday.pause" variant="secondary" onclick={pause} />
        <Button doc="matchday.skip" variant="ghost" onclick={skipToEnd} />
      {:else}
        <Button doc="matchday.resume" onclick={start} />
        <Button doc="matchday.skip" variant="ghost" onclick={skipToEnd} />
      {/if}
    </div>

    <!-- aria-live="polite" rather than assertive: a goal should be announced
         after the current phrase, not on top of it. -->
    <ol class="feed" aria-live="polite" aria-label="Spielverlauf">
      {#each shown as { beat, i } (i)}
        <li class={toneOf(beat)} class:goal={beat.kind === 'goal'}>
          <span class="m tabular">{beat.minute}'</span>
          <i class="g" aria-hidden="true">{GLYPH[beat.kind]}</i>
          <span class="t">{beat.text}</span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .live {
    border: 1px solid var(--border-strong); border-radius: var(--r-md);
    background: var(--bg-card); overflow: hidden; margin-bottom: var(--s4);
  }

  header { padding: var(--s3); border-bottom: 1px solid var(--border); }

  .clock { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s2); }
  .dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--c-live);
    animation: pulse 1.6s ease-in-out infinite;
  }
  /* A pulsing dot is decoration for anyone who does not want motion; the
     minute counter carries the same fact without it. */
  @media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
  .min { font-family: var(--font-num); font-size: var(--fs-caption); color: var(--c-live-ink); }
  .done .min { color: var(--text-muted); }

  .board { display: flex; align-items: center; gap: var(--s3); }
  .team { flex: 1; font-size: var(--fs-body); color: var(--text-muted); line-height: var(--lh-tight); }
  .team.right { text-align: right; }
  .figure {
    flex: none; font-family: var(--font-num); font-size: var(--fs-display);
    font-weight: 800; color: var(--text-main);
  }

  .controls { display: flex; gap: var(--s2); padding: var(--s3); border-bottom: 1px solid var(--border); }
  .controls.hidden { display: none; }

  .ask { padding: var(--s3); border-bottom: 1px solid var(--border); background: var(--primary-glow); }
  .q { font-size: var(--fs-body); font-weight: 700; color: var(--text-main); margin-bottom: var(--s3); }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s2); }
  .opt {
    display: block; width: 100%; text-align: left; cursor: pointer;
    padding: var(--s2) var(--s3); min-height: var(--tap);
    border: 1px solid var(--border-strong); border-radius: var(--r-sm);
    background: var(--bg-card); font: inherit;
  }
  .opt:hover { border-color: var(--primary-ink); }
  .opt:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .opt b { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .opt small { display: block; font-size: var(--fs-caption); color: var(--text-muted); line-height: var(--lh-tight); }

  .feed { list-style: none; margin: 0; padding: 0; max-height: 46vh; overflow-y: auto; }
  .feed li {
    display: flex; align-items: baseline; gap: var(--s2);
    padding: var(--s2) var(--s3); border-bottom: 1px solid var(--border);
    font-size: var(--fs-body);
  }
  .feed li:last-child { border-bottom: 0; }
  .m { flex: none; min-width: 3.5ch; font-family: var(--font-num); font-size: var(--fs-caption); color: var(--text-dim); }
  /* Glyph, not colour alone — the ours/theirs distinction is the one thing in
     the feed that must survive greyscale and deuteranopia. */
  .g { flex: none; }
  .ours .g { color: var(--pos-ink); }
  .theirs .g { color: var(--neg-ink); }
  .neutral .g { color: var(--text-dim); }
  .t { flex: 1; color: var(--text-main); }
  .feed li.goal { background: var(--primary-glow); }
  .feed li.goal .t { font-weight: 700; }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
