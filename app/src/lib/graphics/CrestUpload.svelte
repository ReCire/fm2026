<script lang="ts">
  import Crest from './Crest.svelte';
  import { putCrest, crestUrl, deleteCrest } from './crestStore';

  /**
   * Upload a real crest, with the generated one showing through underneath.
   *
   * The fallback is the whole design. A player who uploads a logo and later
   * clears their browser data must land back on a working mark, never a broken
   * image — so the generated crest is not an empty state, it is the floor. That
   * also makes removing an upload safe to try: you can always see what you get
   * back, because it is what you are looking at right now.
   *
   * No file-size warning. The store downscales on write, so a 4 MB camera photo
   * becomes a working crest instead of an error. "Your file is too big" is a
   * message whose real outcome is that the player gives up.
   */
  let {
    clubId,
    name,
    colours,
    size = 96
  }: {
    clubId: string;
    name: string;
    colours: readonly [string, string];
    size?: number;
  } = $props();

  let url = $state<string | null>(null);
  let busy = $state(false);
  let input: HTMLInputElement;

  // Re-resolve whenever the club changes, so switching subject cannot show the
  // previous club's badge for a frame.
  $effect(() => {
    const id = clubId;
    url = null;
    crestUrl(id).then((u) => {
      if (id === clubId) url = u;
    });
  });

  async function pick(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      await putCrest(clubId, file);
      url = await crestUrl(clubId);
    } finally {
      busy = false;
      if (input) input.value = '';
    }
  }

  async function remove() {
    busy = true;
    try {
      await deleteCrest(clubId);
      url = null;
    } finally {
      busy = false;
    }
  }
</script>

<div class="upload">
  <div class="mark" class:busy style="width: {size}px;">
    {#if url}
      <img src={url} alt="Wappen {name}" width={size} height={size} />
    {:else}
      <Crest {name} {colours} {size} />
    {/if}
  </div>

  <div class="actions">
    <!-- docs-check-ignore: the file input is the mechanism; the documented control is editor.crest -->
    <input
      bind:this={input}
      id="crest-file-{clubId}"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      onchange={pick}
      class="vh"
    />
    <label class="btn" for="crest-file-{clubId}">
      {url ? 'Anderes Wappen' : 'Wappen hochladen'}
    </label>
    {#if url}
      <!-- docs-check-ignore: reverts to the generated crest; documented as editor.crest -->
      <button type="button" class="btn ghost" onclick={remove} disabled={busy}>Eigenes entfernen</button>
      <small class="hint">Ohne eigenes Wappen gilt wieder das erzeugte.</small>
    {/if}
  </div>
</div>

<style>
  .upload { display: flex; flex-direction: column; align-items: center; gap: var(--s2); }
  .mark {
    display: grid; place-items: center;
    /* Width only: the generated crest is a shield and taller than it is wide.
       A square box clipped it and let the button ride up into the artwork. */
    border-radius: var(--r-sm);
  }
  .mark.busy { opacity: 0.5; }
  .mark img { object-fit: contain; display: block; max-width: 100%; height: auto; }

  .actions { display: flex; flex-direction: column; align-items: center; gap: var(--s1); }
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: var(--tap); padding: 0 var(--s3);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); color: var(--text-main);
    font-family: inherit; font-size: var(--fs-caption); font-weight: 700;
    cursor: pointer; text-align: center;
  }
  .btn.ghost { background: none; color: var(--text-muted); }
  .btn:focus-within, .btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  input[type='file']:focus-visible + .btn { outline: 2px solid var(--primary); outline-offset: 2px; }
  .hint { font-size: var(--fs-caption); color: var(--text-dim); text-align: center; max-width: 24ch; line-height: var(--lh-body); }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
