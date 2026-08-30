<script lang="ts">
  import { registry, game } from '$lib/state/game.svelte';
  import { page } from '$app/state';
  import { Panel } from '$lib/ui';

  const id = $derived(page.params.module ?? '');
  /*
   * A locked module is ABSENT, not merely absent from the sidebar.
   *
   * The nav has always filtered by the gate, so a department the player has not
   * unlocked does not advertise itself — but typing the URL, or following a
   * link from an old toast, walked straight into a screen for a feature that
   * was not ticking. It rendered its empty state, which reads as a broken
   * feature rather than a locked one.
   */
  const mod = $derived.by(() => {
    const found = registry.byId.get(id);
    if (!found) return undefined;
    return (found.gate?.(game) ?? true) ? found : undefined;
  });

  // Screens are lazy-loaded from the module manifest, so a feature's UI is only
  // downloaded when the player actually opens it.
  const screen = $derived(mod?.screen?.());
</script>

{#if !mod}
  <Panel title="Unbekannter Bereich" accent="danger">
    <p>Es gibt kein Modul mit der Kennung „{id}".</p>
  </Panel>
{:else if screen}
  {#await screen}
    <Panel title={mod.title}><p class="loading">Lädt…</p></Panel>
  {:then loaded}
    {@const Screen = (loaded as { default: any }).default}
    <Screen />
  {:catch err}
    <Panel title={mod.title} accent="danger">
      <p>Dieser Bereich konnte nicht geladen werden.</p>
      <pre>{err.message}</pre>
    </Panel>
  {/await}
{:else}
  <Panel title={mod.title}><p>{mod.summary}</p></Panel>
{/if}

<style>
  .loading { color: var(--text-muted); }
  pre { font-size: var(--fs-caption); color: var(--danger-ink); white-space: pre-wrap; }
</style>
