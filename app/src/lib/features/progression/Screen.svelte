<script lang="ts">
  /**
   * Structural only. Visual language is the Creative Director's call —
   * this composes primitives and sets no colours of its own.
   */
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, Bar, toast } from '$lib/ui';
  import { narrativeById } from './content';
  import { progressRatio, nextUnlock, delegate, revoke, isDelegated } from './rules';
  import { earnableBadges } from '$lib/content/badges';

  const p = $derived(game.modules.progression);
  const narrative = $derived(narrativeById(p.narrativeId));
  const ratio = $derived(progressRatio(p));
  const upcoming = $derived(nextUnlock(p));

  const openModules = $derived(
    registry.all.filter((m) => p.unlocked.includes(m.id) && m.nav)
  );

  /*
   * Auszeichnungen.
   *
   * `earnableBadges()`, never the raw catalogue: the prototype had badges for
   * a European cup, four factories and a catering mile, none of which
   * existed in it, and they sat in the list forever looking like things the
   * player had failed at. An unreachable badge is hidden, not shown locked.
   *
   * Three states, not two. A secret badge shows in full once earned — icon,
   * name, the desc that was written as a punchline rather than an
   * instruction — because withholding it after the fact means the joke never
   * lands and the player is told only that a number moved. Unearned secrets
   * are the only ones that stay a silhouette, counted rather than named.
   */
  const registeredModules = $derived(new Set(registry.all.map((mod) => mod.id)));
  const earnable = $derived(earnableBadges(registeredModules));
  const earnedIds = $derived(new Set(game.modules.progression.earnedBadges));
  const earnedCount = $derived(earnable.filter((b) => earnedIds.has(b.id)).length);
  /** Non-secret, plus any secret already earned — catalogue order preserved. */
  const shown = $derived(earnable.filter((b) => !b.secret || earnedIds.has(b.id)));
  /** Only the ones still hidden — this is what makes the count mean something
      when it changes: watching it drop from 8 to 7 says a secret landed
      without saying which one. */
  const lockedSecrets = $derived(earnable.filter((b) => b.secret && !earnedIds.has(b.id)).length);

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

<Panel title="Auszeichnungen" accent="gold" meta="{earnedCount} / {earnable.length}">
  {#if shown.length === 0 && lockedSecrets === 0}
    <p class="empty">Hier stehen die Auszeichnungen, sobald welche da sind.</p>
  {:else}
    <ul class="badges">
      {#each shown as b (b.id)}
        {@const earned = earnedIds.has(b.id)}
        <li class="badge" class:earned>
          <span class="bicon" aria-hidden="true">{b.icon}</span>
          <span class="btext">
            <b>{b.name}</b>
            <!-- The earned/unearned line is present or absent, not just
                 recoloured — an opacity change alone reads as nothing in
                 greyscale, and this does the same job without relying on it. -->
            {#if earned}<small>{b.desc}</small>{/if}
          </span>
        </li>
      {/each}
      {#if lockedSecrets > 0}
        <li class="badge secret">
          <span class="bicon" aria-hidden="true">🔒</span>
          <span class="btext">
            <b>{lockedSecrets} {lockedSecrets === 1 ? 'geheime Auszeichnung' : 'geheime Auszeichnungen'}</b>
          </span>
        </li>
      {/if}
    </ul>
  {/if}
</Panel>

<style>
  .premise { color: var(--text-muted); font-size: var(--fs-body); margin-bottom: var(--s3); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); margin-bottom: var(--s2); }
  .next { margin-top: var(--s2); font-size: var(--fs-caption); color: var(--text-muted); }
  .mods { list-style: none; display: flex; flex-direction: column; gap: var(--s2); }
  .mods li { display: flex; align-items: center; justify-content: space-between; gap: var(--s3); padding: var(--s2) 0; border-bottom: 1px solid var(--border); }
  .mods strong { display: block; font-size: var(--fs-body); }
  .mods small { color: var(--text-muted); font-size: var(--fs-caption); }
  .mods li :global(.wrap) { width: auto; flex: none; }

  .empty { font-size: var(--fs-caption); color: var(--text-muted); }
  .badges { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s2); }
  .badge {
    display: flex; align-items: center; gap: var(--s3);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border);
  }
  .badge:last-child { border-bottom: 0; }
  .bicon { flex: none; font-size: 22px; line-height: 1; }
  .btext { min-width: 0; }
  .btext b { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .btext small { display: block; color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-tight); margin-top: 2px; }
  /* Unearned: dimmed AND missing its desc line — never dimmed alone, the same
     rule as a suspended player elsewhere in the app. */
  .badge:not(.earned) .bicon,
  .badge:not(.earned) .btext b { opacity: 0.5; }
  .badge.secret .bicon { opacity: 0.7; }
</style>
