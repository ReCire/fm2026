<script lang="ts">
  import {
    SHIELD_PATH, CREST_VIEWBOX, divisionFor, divisionPath,
    crestInitials, showsInitials, crestHeight
  } from './crest';

  let {
    name,
    colours,
    size = 56,
    /** Force initials on or off. Omit to use the size threshold. */
    plain
  }: {
    name: string;
    colours: readonly [string, string];
    size?: number;
    plain?: boolean;
  } = $props();

  const division = $derived(divisionFor(name));
  const showInitials = $derived(plain !== undefined ? !plain : showsInitials(size));

  /*
   * A component rather than an HTML string builder.
   *
   * The prototype had to hand-escape the club name and mint a unique clipPath
   * id per call to avoid collisions when several crests share a document.
   * Svelte escapes text nodes itself, and the clip path is scoped by a
   * per-instance id here — so two whole classes of bug simply do not arise.
   */
  const clipId = `crest-${Math.random().toString(36).slice(2, 9)}`;
</script>

<svg
  viewBox="0 0 {CREST_VIEWBOX.width} {CREST_VIEWBOX.height}"
  width={size}
  height={crestHeight(size)}
  role="img"
  aria-label="Wappen {name}"
  class="crest"
>
  <defs>
    <clipPath id={clipId}><path d={SHIELD_PATH} /></clipPath>
  </defs>

  <g clip-path="url(#{clipId})">
    <rect x="0" y="0" width={CREST_VIEWBOX.width} height={CREST_VIEWBOX.height} fill={colours[0]} />
    <path d={divisionPath(division)} fill={colours[1]} />
  </g>

  <path d={SHIELD_PATH} fill="none" stroke={colours[1]} stroke-width="4" />
  <path d={SHIELD_PATH} fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.5" />

  {#if showInitials}
    <text
      x="50" y="60"
      text-anchor="middle" dominant-baseline="central"
      font-size="34" font-weight="800"
      fill={colours[1]}
      stroke="rgba(0,0,0,.35)" stroke-width="0.6" paint-order="stroke"
    >{crestInitials(name)}</text>
  {/if}
</svg>

<style>
  .crest { display: block; flex: none; }
  text { font-family: var(--font-ui); }
</style>
