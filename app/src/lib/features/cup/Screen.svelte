<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip } from '$lib/ui';
  import { teamById } from '../league/rules';
  import { roundName, prizeFor, tieFor, winnerOf, scoreline, ROUNDS } from './rules';
  import { cupContent } from './content';
  import { formatMoney } from '../finance/rules';

  const cup = $derived(game.modules.cup);
  const league = $derived(game.modules.league);
  const us = $derived(league.playerClubId);

  /* By id, always. The editor renames every club, and a bracket that stored
     names would stop recognising its own home side the moment it was used. */
  const nameOf = (id: string) => teamById(league, id)?.name ?? 'Unbekannt';

  const ourRound = $derived(
    cup.rounds.findLast((r) => tieFor(r, us) !== undefined)
  );
  const ourTie = $derived(ourRound ? tieFor(ourRound, us) : undefined);
  const wonIt = $derived(
    !!ourTie && ourRound?.roundIndex === ROUNDS - 1 && ourTie.played && winnerOf(ourTie) === us
  );

  /** Where we got to, in words. The one thing the player wants at a glance. */
  const standing = $derived.by(() => {
    if (wonIt) return 'Pokalsieger';
    if (!cup.active) return ourRound ? `Aus: ${roundName(ourRound.roundIndex)}` : 'Ausgeschieden';
    if (!ourTie) return 'Nicht im Wettbewerb';
    return ourTie.played ? `Weiter ins ${roundName(ourRound!.roundIndex + 1)}` : roundName(ourRound!.roundIndex);
  });

  const nextMatchday = $derived(
    cupContent.roundMatchdays.find((md) => md >= game.meta.matchday)
  );
</script>

<Panel title="Pokal" accent="gold" meta="Saison {game.meta.season}">
  <div class="chips">
    <StatChip label="Stand" value={standing} doc="cup.bracket"
              tone={wonIt ? 'good' : cup.active ? 'neutral' : 'bad'} />
    <StatChip label="Pokalsiege" value={cup.titles} doc="cup.titles"
              tone={cup.titles > 0 ? 'good' : 'neutral'} />
    <StatChip label="Nächste Runde"
              value={cup.active && nextMatchday ? `Spieltag ${nextMatchday}` : '—'} doc="cup.bracket" />
  </div>

  {#if cup.active && ourTie && !ourTie.played}
    {@const opponent = ourTie.homeId === us ? ourTie.awayId : ourTie.homeId}
    <p class="fixture">
      <strong>{ourTie.homeId === us ? 'Heim' : 'Auswärts'}</strong> gegen
      <strong>{nameOf(opponent)}</strong>
      <span class="dim">· {formatMoney(prizeFor(ourRound!.roundIndex))} bei einem Sieg</span>
    </p>
  {:else if !cup.active}
    <p class="dim">Der Pokal läuft ohne dich weiter. Nächste Saison neu.</p>
  {/if}
</Panel>

{#each [...cup.rounds].reverse() as round (round.roundIndex)}
  {@const ours = tieFor(round, us)}
  <Panel
    title={roundName(round.roundIndex)}
    accent={ours ? 'gold' : 'accent'}
    meta="{round.pairings.length} {round.pairings.length === 1 ? 'Spiel' : 'Spiele'}"
  >
    <ul class="ties">
      {#each round.pairings as p (p.homeId + p.awayId)}
        {@const winner = winnerOf(p)}
        <li class:mine={p.homeId === us || p.awayId === us}>
          <!-- The winner in full weight, the loser dimmed: a bracket is read by
               scanning for who survived, not by reading every line. -->
          <span class="side" class:out={p.played && winner !== p.homeId}>{nameOf(p.homeId)}</span>
          <span class="score tabular">{scoreline(p)}</span>
          <span class="side right" class:out={p.played && winner !== p.awayId}>{nameOf(p.awayId)}</span>
        </li>
      {/each}
    </ul>
  </Panel>
{/each}

{#if cup.rounds.length === 0}
  <Panel title="Auslosung" accent="accent">
    <p class="dim">Der Turnierbaum wird zu Saisonbeginn gelost.</p>
  </Panel>
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .fixture { font-size: var(--fs-body); color: var(--text-main); }
  .dim { color: var(--text-dim); font-size: var(--fs-caption); }

  .ties { list-style: none; margin: 0; padding: 0; }
  .ties li {
    display: flex; align-items: baseline; gap: var(--s2);
    padding: var(--s2) var(--s2); border-bottom: 1px solid var(--border);
    font-size: var(--fs-caption);
  }
  .ties li:last-child { border-bottom: 0; }
  .ties li.mine { background: var(--primary-glow); border-radius: var(--r-sm); }
  .side { flex: 1; color: var(--text-main); min-width: 0; }
  .side.right { text-align: right; }
  .side.out { color: var(--text-dim); text-decoration: line-through; }
  .score {
    flex: none; min-width: 6ch; text-align: center;
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
