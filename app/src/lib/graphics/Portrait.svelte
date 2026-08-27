<script lang="ts">
  import { traitsFor, SKIN, HAIRCOL } from './portrait';

  /**
   * A generated manager portrait.
   *
   * Geometry rather than illustration, for the same reason the crest is: no
   * binary assets, everything derived from a seed. And because a drawn face
   * invites the player to read a specific person into it, where a constructed
   * one stays a placeholder for themselves.
   *
   * The mark degrades like the crest: below 40px the distinguishing feature is
   * dropped, because a pair of spectacles at 28px is two grey smudges. Silhouette
   * and colour carry it alone at that size.
   */
  let {
    seed,
    size = 56,
    label
  }: { seed: string; size?: number; label?: string } = $props();

  const t = $derived(traitsFor(seed));
  const skin = $derived(SKIN[t.skinStep]!);
  const hair = $derived(HAIRCOL[t.hairStep]!);
  const detail = $derived(size >= 40);
</script>

<svg
  viewBox="0 0 64 64"
  width={size}
  height={size}
  class="portrait"
  role="img"
  aria-label={label ?? 'Porträt'}
>
  <circle cx="32" cy="32" r="32" fill="var(--bg-inset)" />

  <!-- Shoulders. Clipped by the frame, so the figure reads as a bust. -->
  <path d="M10 64 C10 50 20 44 32 44 C44 44 54 50 54 64 Z" fill="var(--wada-squad-1)" />
  <path d="M27 44 h10 v6 h-10 Z" fill={skin} />

  <!-- Head -->
  <rect x="20" y="16" width="24" height="28" rx="11" fill={skin} />

  {#if t.hair === 'crop'}
    <path d="M20 27 C20 17 26 13 32 13 C38 13 44 17 44 27 L44 23 C40 20 24 20 20 23 Z" fill={hair} />
  {:else if t.hair === 'parted'}
    <path d="M20 26 C20 16 27 13 32 13 C39 13 44 17 44 26 C40 20 34 22 30 20 C26 22 22 22 20 26 Z" fill={hair} />
  {:else if t.hair === 'swept'}
    <path d="M20 26 C20 16 27 13 33 13 C41 13 45 18 44 26 C38 18 28 19 20 26 Z" fill={hair} />
  {:else if t.hair === 'curls'}
    <g fill={hair}>
      <circle cx="24" cy="19" r="5" /><circle cx="32" cy="16" r="6" /><circle cx="40" cy="19" r="5" />
    </g>
  {:else if t.hair === 'cap'}
    <path d="M19 23 C19 15 26 12 32 12 C38 12 45 15 45 23 Z" fill="var(--wada-match-3)" />
    <rect x="17" y="22" width="30" height="3" rx="1.5" fill="var(--wada-match-3)" />
  {/if}
  <!-- 'bald' draws no hair at all. -->

  {#if detail}
    {#if t.feature === 'glasses'}
      <g fill="none" stroke="var(--wada-under-2)" stroke-width="1.6">
        <rect x="22" y="27" width="8" height="7" rx="2" />
        <rect x="34" y="27" width="8" height="7" rx="2" />
        <path d="M30 30 h4" />
      </g>
    {:else if t.feature === 'beard'}
      <path d="M21 34 C21 44 26 47 32 47 C38 47 43 44 43 34 C40 40 24 40 21 34 Z" fill={hair} opacity="0.9" />
    {:else if t.feature === 'moustache'}
      <path d="M27 37 C29 35 35 35 37 37 C35 38.5 29 38.5 27 37 Z" fill={hair} />
    {:else if t.feature === 'scarf'}
      <path d="M22 46 C26 50 38 50 42 46 L44 52 C38 56 26 56 20 52 Z" fill="var(--wada-industry-1)" />
    {/if}
    <!-- Eyes only at detail size; two dots at 28px are noise, not a face. -->
    <g fill="var(--wada-under-2)">
      <circle cx="27" cy="31" r="1.4" /><circle cx="37" cy="31" r="1.4" />
    </g>
  {/if}
</svg>

<style>
  .portrait { display: block; border-radius: 50%; overflow: hidden; }
</style>
