<script lang="ts">
  import { game, advance, lastTick, registry } from '$lib/state/game.svelte';
  import { canUndo } from '$lib/state/history.svelte';
  import { undo } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, fromEvent } from '$lib/ui';
  import { formatMoney, matchdayNet, breakdown } from '$lib/features/finance/rules';
  import { attendance, capacity } from '$lib/features/stadium/rules';
  import { allAttention } from '$lib/shell';
  import { wageBill, teamStrength } from '$lib/features/squad/rules';

  const finance = $derived(game.modules.finance);
  const squad = $derived(game.modules.squad);
  const stadium = $derived(game.modules.stadium);

  const lastNet = $derived(matchdayNet(finance, game.meta.season, game.meta.matchday - 1));
  const lastBreakdown = $derived(breakdown(finance, game.meta.season, game.meta.matchday - 1));

  const waiting = $derived(allAttention());
  const now = $derived(waiting.filter((w) => w.item.urgency === 'now'));
  const soon = $derived(waiting.filter((w) => w.item.urgency === 'soon'));

  function playMatchday() {
    const result = advance('matchday');
    for (const e of result.events) fromEvent(e);
  }

  function stepBack() {
    if (!undo()) return;
  }
</script>

<!--
  What is waiting, before anything else on the screen.

  The nav badges are a count and a hover. A count tells you a department has
  something; it cannot tell you whether it is worth the trip, and the hover that
  would is not available on a phone — which is the device this game is for. So
  the badge sends you to find out, which is the errand it was supposed to save.

  Urgency is carried by the two headings rather than by a colour or a dot: the
  structure says which is which, it survives greyscale, and it reads correctly
  to anyone who cannot see the difference between an amber pip and a red one.

  Rendered only when something is actually waiting. A panel that says "nothing
  to do" every week is a panel players learn to scroll past, and it would take
  the weeks that DO have something with it.

  Not `accent="danger"`, which is what it wanted to be: this panel holds both
  urgencies at once, so a permanently alarming heading over a list that is
  usually routine housekeeping is crying wolf on the player's own dashboard.
  The two section headings say which is which; the panel itself stays neutral.
-->
{#if waiting.length > 0}
  <Panel title="Was wartet" accent="primary" meta="{waiting.length} offen">
    {#if now.length}
      <p class="urgency">Jetzt</p>
      <ul class="waiting">
        {#each now as w (w.moduleId + w.item.id)}
          <li><a href="/{w.moduleId}"><span class="dept">{w.title}</span>{w.item.label}</a></li>
        {/each}
      </ul>
    {/if}
    {#if soon.length}
      <p class="urgency">Demnächst</p>
      <ul class="waiting">
        {#each soon as w (w.moduleId + w.item.id)}
          <li><a href="/{w.moduleId}"><span class="dept">{w.title}</span>{w.item.label}</a></li>
        {/each}
      </ul>
    {/if}
  </Panel>
{/if}

<Panel title="Zentrale" accent="accent" meta="Saison {game.meta.season}">
  <div class="chips">
    <StatChip label="Vereins-Konto" value={formatMoney(finance.money)} doc="finance.balance"
              tone={finance.money < 0 ? 'bad' : 'good'} />
    <StatChip label="Transferbudget" value={formatMoney(finance.transferBudget)} doc="finance.transferBudget" />
    <StatChip label="Gehälter / Spieltag" value={formatMoney(wageBill(squad))} doc="squad.wage" />
    <StatChip label="Teamstärke" value={teamStrength(squad, true)} doc="squad.strength" />
    <StatChip label="Zuschauer" value={attendance(stadium).toLocaleString('de-DE')} doc="stadium.attendance" />
    <StatChip label="Kapazität" value={capacity(stadium).toLocaleString('de-DE')} doc="stadium.capacity" />
  </div>

  <div class="actions">
    <Button doc="game.advance" onclick={playMatchday} explain />
    <Button doc="game.undo" variant="ghost" onclick={stepBack} disabled={!canUndo()} />
  </div>
</Panel>

{#if lastTick.result}
  <Panel title="Spieltagsbericht" accent="primary" meta={formatMoney(lastNet)}>
    <ul class="events">
      {#each lastTick.result.events as e, i (i)}
        <li class={e.severity}>
          <strong>{e.title}</strong>
          {#if e.detail}<span>{e.detail}</span>{/if}
          {#if e.amount !== undefined}<em class="tabular">{formatMoney(e.amount)}</em>{/if}
        </li>
      {/each}
    </ul>

    <h4>Nach Quelle</h4>
    <ul class="sources">
      {#each lastBreakdown as row (row.source)}
        <li>
          <span>{registry.byId.get(row.source)?.title ?? row.source}</span>
          <em class="tabular" class:neg={row.amount < 0}>{formatMoney(row.amount)}</em>
        </li>
      {/each}
    </ul>
  </Panel>
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .actions { display: flex; flex-direction: column; gap: var(--s2); }
  .events { list-style: none; display: flex; flex-direction: column; gap: var(--s2); }
  .events li {
    border-left: 3px solid var(--text-dim);
    padding: var(--s2) var(--s2);
    background: rgba(0,0,0,0.25);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    display: grid;
  }
  .events .good { border-left-color: var(--primary-ink); }
  .events .warn { border-left-color: var(--accent-ink); }
  .events .bad { border-left-color: var(--danger-ink); }
  .events .info { border-left-color: var(--blue-ink); }
  .events strong { font-size: var(--fs-body); }
  .events span { font-size: var(--fs-caption); color: var(--text-muted); }
  .events em { font-style: normal; font-size: var(--fs-caption); color: var(--text-muted); }
  h4 { font-size: var(--fs-caption); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin: var(--s3) 0 var(--s2); }
  .sources { list-style: none; display: flex; flex-direction: column; gap: 2px; }
  .sources li { display: flex; justify-content: space-between; padding: var(--s1) 0; border-bottom: 1px solid var(--border); }
  .sources em { font-style: normal; color: var(--primary-ink); }
  .sources .neg { color: var(--danger-ink); }
  .urgency {
    margin: var(--s4) 0 var(--s2);
    font-size: var(--fs-caption);
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .urgency:first-child { margin-top: 0; }
  .waiting { list-style: none; margin: 0; padding: 0; }
  .waiting li { border-bottom: 1px solid var(--border); }
  .waiting li:last-child { border-bottom: 0; }
  .waiting a {
    display: block;
    padding: var(--s3) 0;
    color: var(--text-main);
    text-decoration: none;
  }
  .waiting a:hover, .waiting a:focus-visible { text-decoration: underline; }
  .dept {
    display: block;
    font-size: var(--fs-caption);
    color: var(--text-muted);
  }
</style>
