<script lang="ts">
  import { registry } from '$lib/state/game.svelte';
  import { page } from '$app/state';
  import { Panel } from '$lib/ui';

  const id = $derived(page.params.module ?? '');
  const mod = $derived(registry.byId.get(id));

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
  pre { font-size: var(--fs-caption); color: var(--danger); white-space: pre-wrap; }
</style>
