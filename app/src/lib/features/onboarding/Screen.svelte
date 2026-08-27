<script lang="ts">
  /**
   * The new-game flow. STRUCTURE ONLY.
   *
   * Every visual decision here is provisional and belongs to the Creative
   * Director: crest rendering, avatar artwork, the carousel treatment, spacing,
   * type. This file composes primitives and design tokens, sets no colour of
   * its own, and keeps all logic in rules.ts — so the whole surface can be
   * replaced without touching a single rule.
   */
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, Marks, toast } from '$lib/ui';
  import { STEPS } from './state';
  import { onboardingContent, clubById } from './content';
  import Crest from '$lib/graphics/Crest.svelte';
  import { narratives } from '../progression/content';
  import { applyNarrative } from '../progression/rules';
  import {
    blockers, canAdvance, advance, back, chooseClub,
    clubsForNarrative, suggestName, finish, skip, stepIndex
  } from './rules';

  const o = $derived(game.modules.onboarding);
  const club = $derived(clubById(o.clubId));
  const narrative = $derived(narratives.find((n) => n.id === o.narrativeId));
  // Clubs narrow to the story, not the other way round: the premise makes
  // claims about the club's situation, so it has to pick first.
  const availableClubs = $derived(clubsForNarrative(narrative, onboardingContent.clubs));
  const problems = $derived(blockers(o));
  const position = $derived(stepIndex(o.step));

  function start() {
    const setup = finish(o);
    if (!setup) return;
    const chosen = narratives.find((n) => n.id === o.narrativeId) ?? narratives[0]!;
    applyNarrative(game.modules.progression, chosen);
    game.modules.progression.started = true;
    game.modules.finance.money = chosen.startingMoney;
    game.modules.finance.transferBudget = chosen.startingTransferBudget;
    toast(`Willkommen bei ${setup.club.name}`, chosen.pitch, 'good');
  }

  /*
   * A blocked press routes rather than no-ops.
   *
   * That is what makes keeping the button visible worth anything: an
   * unavailable control must still explain AND still lead somewhere. The
   * reasons are associated by aria-describedby, and pressing moves focus to
   * whatever is unmet — so the blocker is a route, not a notice.
   */
  function next() {
    if (canAdvance(o)) {
      advance(o);
      return;
    }
    const target = document.querySelector<HTMLElement>('[data-first-field]');
    target?.focus();
  }

  function quickStart() {
    skip(o);
    const narrative = narratives[0]!;
    applyNarrative(game.modules.progression, narrative);
    game.modules.progression.started = true;
    toast('Karriere gestartet', narrative.pitch, 'good');
  }
</script>

<!-- Progress is stated as text as well as shape, so it is not carried by
     position alone for anyone using a screen reader. -->
<ol class="steps" aria-label="Fortschritt: Schritt {position + 1} von {STEPS.length}">
  {#each STEPS as s, i (s)}
    <li class:done={i < position} class:now={i === position} aria-current={i === position ? 'step' : undefined}></li>
  {/each}
</ol>

{#if o.step === 'welcome'}
  <Panel title="Anstoß" accent="primary">
    <p>Du übernimmst einen Verein. Wie es ausgeht, entscheidest du.</p>
    <p class="muted">Fünf kurze Schritte. Du kannst jederzeit zurück.</p>
  </Panel>

{:else if o.step === 'manager'}
  <Panel title="Wer bist du?" accent="accent">
    <label class="field" for="mgr-name">Name</label>
    <!-- docs-check-ignore: a text field is not a documented control; its label is -->
    <input
      id="mgr-name"
      data-first-field
      type="text"
      maxlength="28"
      bind:value={o.manager.name}
      placeholder={suggestName('anstoss')}
      aria-describedby="mgr-name-help"
    />
    <p id="mgr-name-help" class="muted">So sprechen dich Presse und Vorstand an.</p>

    <fieldset>
      <legend>Porträt</legend>
      <div class="avatars">
        {#each onboardingContent.avatars as a (a.id)}
                <label class="avatar" class:on={o.manager.avatarId === a.id}>
            <!-- docs-check-ignore: the documented control is the group (onboarding.avatar); the hidden radio is its mechanism -->
            <input type="radio" name="avatar" value={a.id} bind:group={o.manager.avatarId} />
            <span class="face" aria-hidden="true">{a.label.slice(0, 1)}</span>
            <span class="vh">{a.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Herkunft</legend>
      {#each onboardingContent.backgrounds as b (b.id)}
        <label class="bg" class:on={o.manager.background === b.id}>
          <!-- docs-check-ignore: documented as a group (onboarding.background) -->
          <input type="radio" name="bg" value={b.id} bind:group={o.manager.background} />
          <strong>{b.label}</strong><small>{b.blurb}</small>
        </label>
      {/each}
    </fieldset>
  </Panel>

{:else if o.step === 'narrative'}
  <Panel title="Wie fängt es an?" accent="accent">
    {#each narratives as n, i (n.id)}
      <label class="narr" class:on={o.narrativeId === n.id}>
        <!-- docs-check-ignore: documented as a group (progression.narrative) -->
        <input type="radio" name="narr" value={n.id} bind:group={o.narrativeId} data-first-field={i === 0 ? '' : undefined} />
        <span>
          <strong>{n.name}{#if n.recommended}<span class="rec">Empfohlen</span>{/if}</strong>
          <em>{n.pitch}</em>
          <small>{n.premise}</small>
          <small class="diff">Schwierigkeit: {n.difficulty}</small>
          <!-- The honest axis between the five starts is not harder/easier, it
               is how much is open at the beginning. Shown as marks rather than
               a count so a narrow start reads as focused rather than poorer —
               otherwise four of five look like consolation prizes beside the
               recommended one. -->
          <Marks
            value={n.unlockedAtStart.length}
            total={n.unlockedAtStart.length + n.unlockOrder.length}
            label="{n.unlockedAtStart.length} von {n.unlockedAtStart.length + n.unlockOrder.length} Bereichen von Beginn an offen"
          />
        </span>
      </label>
    {/each}
  </Panel>

{:else if o.step === 'club'}
  <Panel title="Welchen Verein übernimmst du?" accent="accent" meta={narrative?.name}>
    <div class="clubs">
      {#each availableClubs as c, i (c.id)}
        <label class="club" class:on={o.clubId === c.id}>
          <!-- docs-check-ignore: documented as a group (onboarding.club) -->
          <input type="radio" name="club" value={c.id} onchange={() => chooseClub(o, c.id)} checked={o.clubId === c.id} data-first-field={i === 0 ? '' : undefined} />
          <!-- 56px: initials stay legible and the whole set fits a 375px screen
               without scrolling. Not smaller, even though the mark survives it —
               the club step is the one moment the identity should feel like
               something rather than a bullet. -->
          <Crest name={c.name} colours={c.colours} size={56} />
          <span class="meta">
            <strong>{c.name}</strong>
            <small>{c.city} · Liga {c.leagueLevel + 1}</small>
            <small class="flav">{c.flavour}</small>
          </span>
        </label>
      {/each}
    </div>
  </Panel>

{:else}
  <Panel title="Bereit?" accent="primary">
    <p><strong>{o.manager.name}</strong> übernimmt <strong>{o.clubName}</strong>.</p>
    <p class="muted">{narratives.find((n) => n.id === o.narrativeId)?.premise}</p>
    <Button doc="onboarding.start" onclick={start} explain />
  </Panel>
{/if}

<p id="onboarding-blockers" class="problems" role="status">
  {#if problems.length > 0}{problems.join(' ')}{/if}
</p>

<div class="nav">
  {#if position > 0}
    <Button doc="onboarding.back" variant="ghost" onclick={() => back(o)} />
  {/if}
  {#if o.step !== 'confirm'}
    <!-- `blocked`, not `disabled`: a disabled button leaves the tab order, so a
         keyboard user reaches the end of the step and finds nothing at all. -->
    <Button
      doc="onboarding.next"
      onclick={next}
      blocked={!canAdvance(o)}
      describedBy={problems.length > 0 ? 'onboarding-blockers' : undefined}
    />
  {/if}
  <Button doc="onboarding.skip" variant="ghost" onclick={quickStart} />
</div>

<style>
  .steps { list-style: none; display: flex; gap: 4px; padding: 0; margin: 0 0 var(--s3); }
  .steps li { flex: 1; height: 3px; border-radius: 2px; background: var(--border); }
  .steps li.done { background: var(--primary); }
  .steps li.now { background: var(--accent); }

  .muted { color: var(--text-muted); font-size: var(--fs-caption); }
  .field { display: block; font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s1); }

  input[type='text'] {
    width: 100%; padding: var(--s2); min-height: 40px;
    background: var(--bg-inset); color: var(--text-main);
    border: 1px solid var(--border-strong); border-radius: var(--r-sm);
    font-family: inherit; font-size: var(--fs-body);
  }

  fieldset { border: 0; margin: var(--s3) 0 0; }
  legend { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }

  /* The radio itself stays in the accessibility tree and keyboard order; only
     its default rendering is hidden. */
  .avatar input, .bg input, .club input, .narr input {
    position: absolute; opacity: 0; width: 1px; height: 1px;
  }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  .avatars { display: flex; gap: var(--s2); flex-wrap: wrap; }
  .avatar { cursor: pointer; }
  .avatar .face {
    display: grid; place-items: center;
    width: 46px; height: 46px; border-radius: var(--r-sm);
    background: var(--bg-sunken); border: 2px solid var(--border);
    font-weight: 800; color: var(--text-muted);
  }
  .avatar.on .face { border-color: var(--primary-ink); color: var(--primary-ink); }
  .avatar input:focus-visible + .face { outline: 2px solid var(--primary); outline-offset: 2px; }

  .bg, .club, .narr {
    display: flex; gap: var(--s2); align-items: flex-start;
    padding: var(--s2); margin-bottom: var(--s2);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--bg-inset); cursor: pointer; min-height: 44px;
  }
  .bg.on, .club.on, .narr.on { border-color: var(--primary-ink); background: var(--primary-glow); }
  .bg input:focus-visible ~ *, .club input:focus-visible ~ *, .narr input:focus-visible ~ * { outline: 2px solid var(--primary); outline-offset: 2px; }

  .bg strong, .club strong, .narr strong { display: block; font-size: var(--fs-body); }
  .bg small, .club small, .narr small { display: block; color: var(--text-muted); font-size: var(--fs-caption); }
  .narr em { display: block; font-style: normal; color: var(--accent-ink); font-size: var(--fs-caption); margin: 2px 0; }
  .narr .diff, .club .flav { margin-top: var(--s1); }

  .clubs { display: grid; gap: var(--s2); }
  .meta { min-width: 0; }

  .problems { color: var(--accent-ink); font-size: var(--fs-caption); margin: var(--s2) 0; }
  .nav { display: flex; gap: var(--s2); margin-top: var(--s3); }
  .nav :global(.wrap) { flex: 1; }
</style>
