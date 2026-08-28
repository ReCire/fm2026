<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import Crest from '$lib/graphics/Crest.svelte';
  import AttributeRadar from '$lib/graphics/AttributeRadar.svelte';
  import { onboardingContent, clubById } from '../onboarding/content';
  import { ATTRIBUTES, ATTRIBUTE_LABEL, ATTRIBUTE_BLURB, POSITION_WEIGHTS, overallFor, type Attribute } from '../squad/attributes';
  import { resolveClub, resolvePlayer, editClub, editPlayer, resetClub, resetPlayer, editCount } from './rules';
  import { editorContent, MAXED } from './content';

  const editor = $derived(game.modules.editor);
  const squad = $derived(game.modules.squad);
  const counts = $derived(editCount(editor));

  /* One thing at a time.
     A nineteen-row grid of five inputs is a spreadsheet, and nobody feels
     anything editing a spreadsheet. The list is an index; the editing happens
     on one subject, large, with the shape front and centre. */
  let subject = $state<{ kind: 'club' | 'player'; id: string } | null>(null);
  let touched = $state<Attribute | null>(null);

  const myClubId = $derived(game.modules.onboarding.clubId);
  const clubs = $derived(onboardingContent.clubs.map((c) => resolveClub(editor, c)));

  const player = $derived(
    subject?.kind === 'player'
      ? squad.players.map((p) => resolvePlayer(editor, p)).find((p) => p.id === subject!.id)
      : undefined
  );
  const club = $derived(
    subject?.kind === 'club' ? clubs.find((c) => c.id === subject!.id) : undefined
  );

  const overall = $derived(player ? overallFor(player.attributes, player.pos) : 0);
  const maxed = $derived(player ? ATTRIBUTES.every((a) => player.attributes[a] >= MAXED) : false);

  function setAttr(a: Attribute, value: number) {
    if (!player) return;
    touched = a;
    editPlayer(editor, player.id, { attributes: { [a]: Math.max(1, Math.min(99, Math.round(value))) } });
  }

  function setClubField(patch: Record<string, unknown>) {
    if (!club) return;
    editClub(editor, club.id, patch);
  }

  function undoPlayer() {
    if (!player) return;
    resetPlayer(editor, player.id);
    toast('Zurückgesetzt', 'Die Originalwerte gelten wieder.', 'good');
  }

  function undoClub() {
    if (!club) return;
    resetClub(editor, club.id);
    toast('Zurückgesetzt', 'Der Verein heißt wieder wie vorher.', 'good');
  }
</script>

{#if !subject}
  <Panel title="Editor" accent="accent">
    <p class="intro">{editorContent.intro}</p>
    <div class="chips">
      <StatChip label="Vereine geändert" value={counts.clubs} doc="editor.clubCount" />
      <StatChip label="Spieler geändert" value={counts.players} doc="editor.playerCount" />
    </div>
    {#if !counts.clubs && !counts.players}
      <p class="muted">{editorContent.emptyState}</p>
    {/if}
  </Panel>

  <Panel title="Vereine">
    <div class="grid">
      {#each clubs as c (c.id)}
        <!-- docs-check-ignore: a list row is navigation into the editor, not a control -->
        <button class="pick club" class:mine={c.id === myClubId} onclick={() => (subject = { kind: 'club', id: c.id })}>
          <Crest name={c.name} colours={c.colours} size={40} />
          <span class="meta">
            <strong>{c.name}</strong>
            <small>{c.city}{c.id === myClubId ? ' · dein Verein' : ''}</small>
          </span>
          {#if editor.clubs[c.id]}<span class="edited" title="geändert">●</span>{/if}
        </button>
      {/each}
    </div>
  </Panel>

  <Panel title="Kader">
    <div class="grid">
      {#each squad.players.map((p) => resolvePlayer(editor, p)) as p (p.id)}
        <!-- docs-check-ignore: a list row is navigation into the editor, not a control -->
        <button class="pick" onclick={() => (subject = { kind: 'player', id: p.id })}>
          <span class="pos">{p.pos}</span>
          <span class="meta">
            <strong>{p.name}</strong>
            <small>Stärke {overallFor(p.attributes, p.pos)} · {p.age} Jahre</small>
          </span>
          {#if editor.players[p.id]}<span class="edited" title="geändert">●</span>{/if}
        </button>
      {/each}
    </div>
  </Panel>

{:else if club}
  <Panel title={club.name} accent="accent" meta="Verein">
    <!-- docs-check-ignore: back link, not a control -->
    <button class="back" onclick={() => (subject = null)}>← Übersicht</button>
    <p class="intro">{editorContent.clubIntro} <Doc id="editor.club" /></p>

    <div class="clubEdit">
      <div class="preview">
        <!-- Live, because changing a colour and seeing the crest change IS the
             feature. A preview behind a save button is a form. -->
        <Crest name={club.name} colours={club.colours} size={96} />
      </div>
      <div class="fields">
        <label class="field" for="club-name">Name</label>
        <!-- docs-check-ignore: text field; the documented control is editor.club -->
        <input id="club-name" type="text" maxlength="48" value={club.name}
               oninput={(e) => setClubField({ name: e.currentTarget.value })} />

        <label class="field" for="club-city">Stadt</label>
        <!-- docs-check-ignore: text field; the documented control is editor.club -->
        <input id="club-city" type="text" maxlength="48" value={club.city}
               oninput={(e) => setClubField({ city: e.currentTarget.value })} />

        <label class="field" for="club-short">Kürzel</label>
        <!-- docs-check-ignore: text field; the documented control is editor.club -->
        <input id="club-short" type="text" maxlength="4" value={club.short}
               oninput={(e) => setClubField({ short: e.currentTarget.value.toUpperCase() })} />

        <span class="field">Farben</span>
        <div class="colours">
          <!-- docs-check-ignore: colour input; the documented control is editor.club -->
          <input type="color" aria-label="Erste Vereinsfarbe" value={club.colours[0]}
                 oninput={(e) => setClubField({ colours: [e.currentTarget.value, club.colours[1]] })} />
          <!-- docs-check-ignore: colour input; the documented control is editor.club -->
          <input type="color" aria-label="Zweite Vereinsfarbe" value={club.colours[1]}
                 oninput={(e) => setClubField({ colours: [club.colours[0], e.currentTarget.value] })} />
        </div>
      </div>
    </div>

    {#if editor.clubs[club.id]}
      <p class="muted">{editorContent.resetHint}</p>
      <Button doc="editor.reset" variant="ghost" onclick={undoClub} />
    {/if}
  </Panel>

{:else if player}
  <Panel title={player.name} accent="accent" meta="{player.pos} · {player.age} Jahre">
    <!-- docs-check-ignore: back link, not a control -->
    <button class="back" onclick={() => (subject = null)}>← Übersicht</button>
    <p class="intro">{editorContent.playerIntro} <Doc id="editor.player" /></p>

    <div class="playerEdit">
      <div class="shape">
        <AttributeRadar
          attributes={player.attributes}
          weights={POSITION_WEIGHTS[player.pos]}
          highlight={touched}
          size={190}
        />
        <div class="overall" class:maxed>
          <span class="ov-label">Gesamtstärke <Doc id="editor.overall" /></span>
          <strong>{overall}</strong>
        </div>
        {#if maxed}<p class="maxed-note">{editorContent.maxedNote}</p>{/if}
      </div>

      <div class="sliders">
        <label class="field" for="p-name">Name</label>
        <!-- docs-check-ignore: text field; the documented control is editor.player -->
        <input id="p-name" type="text" maxlength="48" value={player.name}
               oninput={(e) => editPlayer(editor, player.id, { name: e.currentTarget.value })} />

        {#each ATTRIBUTES as a (a)}
          <div class="attr">
            <label class="attr-head" for="attr-{a}">
              <span class="attr-name">{ATTRIBUTE_LABEL[a]}</span>
              <b class="attr-val">{player.attributes[a]}</b>
            </label>
            <!-- docs-check-ignore: range input; the documented control is editor.player -->
            <input
              id="attr-{a}"
              type="range" min="1" max="99" step="1"
              value={player.attributes[a]}
              aria-describedby="attr-{a}-help"
              oninput={(e) => setAttr(a, Number(e.currentTarget.value))}
            />
            <small id="attr-{a}-help" class="attr-blurb">{ATTRIBUTE_BLURB[a]}</small>
          </div>
        {/each}
      </div>
    </div>

    {#if editor.players[player.id]}
      <p class="muted">{editorContent.resetHint}</p>
      <Button doc="editor.reset" variant="ghost" onclick={undoPlayer} />
    {/if}
  </Panel>
{/if}

<style>
  .intro { color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-body); margin-bottom: var(--s3); }
  .muted { color: var(--text-dim); font-size: var(--fs-caption); line-height: var(--lh-body); margin: var(--s3) 0 var(--s2); }
  .chips { display: flex; gap: var(--s2); flex-wrap: wrap; }

  .back {
    background: none; border: 0; color: var(--primary-ink); font-family: inherit;
    font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
    padding: var(--s2) 0; min-height: var(--tap);
  }

  .grid { display: grid; gap: 1px; }
  .pick {
    display: flex; align-items: center; gap: var(--s3); width: 100%; text-align: left;
    background: none; border: 0; border-bottom: 1px solid var(--border);
    padding: var(--s2) 0; cursor: pointer; font-family: inherit; min-height: var(--tap);
  }
  .pick .meta { flex: 1; min-width: 0; }
  .pick strong { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .pick small { display: block; font-size: var(--fs-caption); color: var(--text-muted); }
  .pick .pos {
    flex: none; width: 34px; font-family: var(--font-num);
    font-size: var(--fs-caption); font-weight: 700; color: var(--text-dim);
  }
  .pick.mine strong { color: var(--primary-ink); }
  /* A dot, not a word: the list is scanned, and "geändert" on nineteen rows is
     noise. The title attribute carries it for anyone who needs the word. */
  .edited { flex: none; color: var(--accent-ink); font-size: 10px; }

  .clubEdit, .playerEdit { display: flex; gap: var(--s4); flex-wrap: wrap; align-items: flex-start; }
  .preview, .shape { flex: none; display: flex; flex-direction: column; align-items: center; gap: var(--s2); }
  .fields, .sliders { flex: 1; min-width: 220px; }

  .field {
    display: block; font-size: var(--fs-caption); font-weight: 700;
    color: var(--text-muted); margin: var(--s3) 0 var(--s1);
  }
  input[type='text'] {
    width: 100%; background: var(--bg-inset); color: var(--text-main);
    border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: var(--s2) var(--s3); font-family: inherit;
    /* 16px: iOS zooms into any field below it on focus. */
    font-size: 16px; min-height: var(--tap);
  }
  .colours { display: flex; gap: var(--s2); }
  input[type='color'] {
    width: 56px; height: var(--tap); padding: 2px;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-sm); cursor: pointer;
  }

  .overall { text-align: center; }
  .ov-label { display: block; font-size: var(--fs-caption); color: var(--text-muted); }
  .overall strong {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-display); font-weight: 800; color: var(--text-main);
    line-height: var(--lh-tight);
  }
  /* The acknowledgement is a colour shift and one dry line, not a modal. The
     shape already did the work — a full pentagon reads as excessive on sight. */
  .overall.maxed strong { color: var(--accent-ink); }
  .maxed-note {
    font-size: var(--fs-caption); color: var(--accent-ink);
    text-align: center; max-width: 22ch; line-height: var(--lh-body);
  }

  .attr { margin-bottom: var(--s3); }
  .attr-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s2); }
  .attr-name { font-size: var(--fs-body); color: var(--text-main); font-weight: 600; }
  .attr-val {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-body); font-weight: 800; color: var(--primary-ink);
  }
  .attr-blurb { display: block; font-size: var(--fs-caption); color: var(--text-dim); margin-top: 2px; }
  input[type='range'] { width: 100%; margin: var(--s1) 0; min-height: 28px; accent-color: var(--primary); }
  input[type='range']:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
</style>
