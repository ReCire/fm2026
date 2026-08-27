<script lang="ts">
  /**
   * Structural only. Visual language is the Creative Director's call —
   * this composes primitives and sets no colours of its own.
   */
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, Bar, toast } from '$lib/ui';
  import { narrativeById } from './content';
  import { progressRatio, nextUnlock, delegate, revoke, isDelegated } from './rules';

  const p = $derived(game.modules.progression);
  const narrative = $derived(narrativeById(p.narrativeId));
  const ratio = $derived(progressRatio(p));
  const upcoming = $derived(nextUnlock(p));

  const openModules = $derived(
    registry.all.filter((m) => p.unlocked.includes(m.id) && m.nav)
  );

  function toggleDelegate(id: string) {
    if (isDelegated(game, id)) {
      revoke(p, id);
      toast('Bereich zurückgenommen', 'Du entscheidest wieder selbst.', 'info');
    } else {
      delegate(p, id, { executiveId: 'exec-default', competence: 0.6, hiredOnMatchday: game.meta.matchday });
      toast('Bereich abgegeben', 'Eine Führungskraft übernimmt.', 'good');
    }
  }
</script>

<Panel title={narrative?.name ?? 'Fortschritt'} accent="primary" meta={narrative?.difficulty}>
  {#if narrative}
    <p class="premise">{narrative.premise}</p>
  {/if}
  <div class="chips">
    <StatChip label="Freigeschaltet" value={p.unlocked.length} doc="progression.unlocks" />
    <StatChip label="Fortschritt" value={`${Math.round(ratio * 100)}%`} doc="progression.progress" />
  </div>
  <Bar value={ratio * 100} label="Fortschritt der Startgeschichte" />
  {#if upcoming}
    <p class="next">Als Nächstes öffnet sich: <strong>{registry.byId.get(upcoming)?.title ?? upcoming}</strong></p>
  {/if}
</Panel>

<Panel title="Bereiche" accent="accent">
  <ul class="mods">
    {#each openModules as m (m.id)}
      <li>
        <div>
          <strong>{m.title}</strong>
          <small>{m.summary}</small>
        </div>
        <Button
          doc="progression.delegate"
          variant={isDelegated(game, m.id) ? 'secondary' : 'ghost'}
          label={isDelegated(game, m.id) ? 'Übernehmen' : 'Abgeben'}
          onclick={() => toggleDelegate(m.id)}
        />
      </li>
    {/each}
  </ul>
</Panel>

<style>
  .premise { color: var(--text-muted); font-size: var(--fs-body); margin-bottom: var(--sp-4); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-2); margin-bottom: var(--sp-3); }
  .next { margin-top: var(--sp-3); font-size: var(--fs-small); color: var(--text-muted); }
  .mods { list-style: none; display: flex; flex-direction: column; gap: var(--sp-2); }
  .mods li { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-2) 0; border-bottom: 1px solid var(--border); }
  .mods strong { display: block; font-size: var(--fs-base); }
  .mods small { color: var(--text-muted); font-size: var(--fs-micro); }
  .mods li :global(.wrap) { width: auto; flex: none; }
</style>
