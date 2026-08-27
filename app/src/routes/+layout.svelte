<script lang="ts">
  import '$lib/design/tokens.css';
  import { game } from '$lib/state/game.svelte';
  // Nav shape comes from $lib/shell, so this file stays presentation. Which
  // modules appear and what counts as new are game-state decisions.
  import { navGroups, primaryNav, initTheme } from '$lib/shell';
  import { page } from '$app/state';
  import Toast from '$lib/ui/Toast.svelte';
  import { formatMoney } from '$lib/features/finance/rules';

  let { children } = $props();

  const groups = $derived(navGroups());
  const primary = $derived(primaryNav());

  $effect(() => { initTheme(); });
  const current = $derived(page.url.pathname.split('/')[1] ?? '');

  let drawerOpen = $state(false);
</script>

<div class="app">
  <header>
    <button class="burger" aria-label="Menü" onclick={() => (drawerOpen = !drawerOpen)}>☰</button>
    <div class="brand">
      <span class="crest">A</span>
      <div>
        <strong>FC Anstoß Pro</strong>
        <small>Saison {game.meta.season} · Spieltag {game.meta.matchday}</small>
      </div>
    </div>
    <div class="balance tabular">{formatMoney(game.modules.finance.money)}</div>
  </header>

  <div class="body">
    <nav class="sidebar" class:open={drawerOpen}>
      {#each groups as group (group.group)}
        <p class="group">{group.group}</p>
        {#each group.items as m (m.id)}
          <!-- No pictogram. With this many entries the icons were noise, and
               none carried information the word did not already carry. A rule
               in the department colour does the wayfinding instead. -->
          <a
            href="/{m.id}"
            class:active={current === m.id}
            onclick={() => (drawerOpen = false)}
          >
            <i class="rule" aria-hidden="true"></i>{m.title}
            {#if m.isNew}<span class="new">neu</span>{/if}
          </a>
        {/each}
      {/each}
    </nav>

    {#if drawerOpen}
      <button class="scrim" aria-label="Menü schließen" onclick={() => (drawerOpen = false)}></button>
    {/if}

    <main>{@render children()}</main>
  </div>

  <nav class="tabbar">
    {#each primary as m (m.id)}
      <!-- An icon earns its place when it is faster to recognise than its
           label at the size it actually appears. In a 28-item nav list the
           word wins and the pictogram is decoration; in a five-item tab bar at
           thumb distance with an 11px label, the mark IS the affordance and
           the word is the fallback. -->
      <a href="/{m.id}" class:on={current === m.id}>
        <span class="ico" aria-hidden="true">{m.icon}</span>
        <span class="lbl">{m.title}</span>
      </a>
    {/each}
    <button class="more" aria-label="Weitere Bereiche" onclick={() => (drawerOpen = true)}>
      <span class="ico" aria-hidden="true">☰</span>
      <span class="lbl">Mehr</span>
    </button>
  </nav>

  <Toast />
</div>

<style>
  .app { display: flex; flex-direction: column; min-height: 100dvh; max-width: 940px; margin: auto; background: var(--bg-sidebar); }

  header {
    display: flex; align-items: center; gap: var(--s3);
    background: var(--bg-header);
    border-bottom: 2px solid var(--border);
    padding: var(--s3);
    padding-top: calc(var(--s3) + var(--safe-top));
    padding-left: calc(var(--s3) + var(--safe-left));
    padding-right: calc(var(--s3) + var(--safe-right));
    position: sticky; top: 0; z-index: 250;
  }
  .burger { background: none; border: none; color: var(--text-main); font-size: var(--fs-title); cursor: pointer; min-width: var(--tap); min-height: var(--tap); }
  .brand { display: flex; align-items: center; gap: var(--s2); flex: 1; min-width: 0; }
  .crest {
    width: 30px; height: 30px; border-radius: 50%;
    background: radial-gradient(circle, #ffc107 20%, #ff8f00 80%);
    display: grid; place-items: center;
    font-weight: 900; color: #000; border: 2px solid #fff;
  }
  .brand strong { display: block; font-size: var(--fs-headline); color: #fff; }
  .brand small { font-size: var(--fs-caption); color: var(--accent); }
  .balance { font-size: var(--fs-title); font-weight: 800; color: var(--primary); }

  .body { display: flex; flex: 1; min-height: 0; }

  .sidebar {
    width: 210px; flex: none;
    background: #0a0e18;
    border-right: 1px solid var(--border);
    padding: var(--s3) var(--s2);
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
  }
  .group { font-size: var(--fs-caption); font-weight: 900; color: var(--text-dim); text-transform: uppercase; margin: var(--s2) var(--s2) var(--s1); }
  .sidebar a {
    display: flex; align-items: center; gap: var(--s2);
    padding: var(--s2) var(--s3);
    border-radius: var(--r-sm);
    color: #cbd5e1; text-decoration: none;
    font-size: var(--fs-body); font-weight: 700;
    border: 1px solid transparent;
  }
  .sidebar a:hover { background: rgba(255,255,255,0.05); color: #fff; }
  .sidebar a.active { background: var(--primary-glow); color: var(--primary); border-color: var(--border-highlight); }
  /* The department rule: 2px in the domain colour, replacing the pictogram. */
  .rule { flex: none; width: 2px; height: 14px; border-radius: 1px; background: currentColor; opacity: 0.45; }
  .sidebar a.active .rule { opacity: 1; }
  .new {
    margin-left: auto;
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--primary-ink, var(--primary));
  }

  /* Landscape on a notched phone: viewport-fit=cover means the notch and the
     rounded corners overlay the page, so content needs the horizontal insets
     as well as the vertical ones. These tokens existed and were unused. */
  main {
    flex: 1; min-width: 0;
    padding: var(--s3);
    padding-left: calc(var(--s3) + var(--safe-left));
    padding-right: calc(var(--s3) + var(--safe-right));
    background: var(--bg-sunken);
    overflow-x: hidden;
  }

  .scrim { display: none; }

  .tabbar { display: none; }

  @media (max-width: 760px) {
    .sidebar {
      position: fixed; top: 0; bottom: 0; left: 0; z-index: 300;
      transform: translateX(-100%); transition: transform 0.22s ease;
      padding-top: calc(var(--s3) + var(--safe-top));
    }
    .sidebar.open { transform: none; }
    .scrim { display: block; position: fixed; inset: 0; z-index: 299; background: rgba(3,6,12,0.72); border: none; }

    main { padding-bottom: calc(72px + var(--safe-bottom)); }

    .tabbar {
      display: flex;
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 300;
      background: rgba(10, 14, 24, 0.94);
      backdrop-filter: blur(14px);
      border-top: 1px solid var(--border);
      padding-bottom: var(--safe-bottom);
      padding-left: var(--safe-left);
      padding-right: var(--safe-right);
    }
    .tabbar a, .tabbar button {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; padding: var(--s2) 2px;
      min-height: 54px;
      background: none; border: none; cursor: pointer;
      color: var(--text-dim); text-decoration: none;
    }
    .tabbar .on { color: var(--primary); }
    .ico { font-size: 17px; line-height: 1; }
    .lbl { font-size: var(--fs-caption); font-weight: 800; }
  }
</style>
