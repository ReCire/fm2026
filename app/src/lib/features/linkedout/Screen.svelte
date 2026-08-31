<script lang="ts">
  import { game, registry } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Sheet, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import Portrait from '$lib/graphics/Portrait.svelte';
  import { handledByExecutives } from '$lib/shell';
  import { formatMoney, post } from '../finance/rules';
  import {
    categories, roleById, pendingRoles, bandFor, copy
  } from './content';
  import { canHire, hire, dismiss, employed, wageBill, moduleFor } from './rules';
  import type { Contact } from './state';

  const lo = $derived(game.modules.linkedout);
  const progression = $derived(game.modules.progression);
  const finance = $derived(game.modules.finance);

  const registered = new Set(registry.all.map((m) => m.id));
  /* Same derivation the tick uses via `ctx.autopilots` — from the registry, so
     a screen cannot tell the player a department is delegable when the tick
     that would run it disagrees. */
  const withAutopilot = new Set(registry.all.filter((m) => m.autopilot).map((m) => m.id));

  const team = $derived(employed(lo, progression));
  const bill = $derived(wageBill(lo, progression));
  const pending = $derived(pendingRoles(registered, withAutopilot));

  /*
   * What the executives are handling right now.
   *
   * This is the whole feature. A delegated department goes silent — that is the
   * mechanic — but a department that is merely silent is indistinguishable from
   * one with nothing in it, which is why hiring someone currently feels like
   * paying for nothing. "Drei Dinge, über die du nicht mehr nachdenken musst"
   * is the proof the wage bought something.
   */
  const handled = $derived(handledByExecutives());
  const handledFor = (moduleId: string) =>
    handled.find((h) => h.moduleId === moduleId)?.items ?? [];

  let open = $state(false);
  let picked = $state<Contact | null>(null);

  const titleOf = (roleId: string) => roleById.get(roleId)?.title ?? roleId;
  const takesOver = (roleId: string) => roleById.get(roleId)?.takesOver ?? '';
  const categoryOf = (roleId: string) => {
    const role = roleById.get(roleId);
    return categories.find((c) => c.id === role?.category)?.label ?? '';
  };

  function show(contact: Contact) {
    picked = contact;
    open = true;
  }

  function doHire(contact: Contact) {
    const check = canHire(lo, progression, contact, finance.money);
    if (!check.ok) return toast('Nicht möglich', check.reason, 'warn');

    const moduleId = hire(lo, progression, contact, game.meta.matchday);
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'linkedout',
      reason: `Antritt ${titleOf(contact.roleId)} — ${contact.name}`,
      amount: -contact.wage
    });
    open = false;
    toast(
      contact.name,
      `Übernimmt ${titleOf(contact.roleId)}. Diese Vorgänge landen ab jetzt nicht mehr bei dir.`,
      'good'
    );
    return moduleId;
  }

  function doDismiss(moduleId: string) {
    const gone = dismiss(lo, progression, moduleId);
    if (gone) toast(gone.name, 'Die Abteilung liegt wieder bei dir.', 'info');
  }

  /** Degree of connection. Network parody, no mechanical effect whatsoever. */
  const degreeLabel = (d: number) => (d === 1 ? '1. Grad' : d === 2 ? '2. Grad' : '3. Grad');
</script>

<Panel title={copy.title} accent="europe" meta={copy.tagline}>
  <div class="chips">
    <StatChip label="Übergeben" value="{team.length} Abteilungen" doc="linkedout.hire" />
    <StatChip label="Gehälter / Spieltag" value={formatMoney(bill)} doc="linkedout.hire"
              tone={bill > 0 ? 'bad' : 'neutral'} />
    <StatChip label="Kontakte" value={lo.contacts.length} doc="linkedout.competence" />
  </div>
</Panel>

{#if team.length > 0}
  <Panel title="Dein Führungsteam" accent="primary" meta={formatMoney(bill)}>
    {#each team as row (row.contact.id)}
      {@const items = handledFor(row.moduleId)}
      <article class="hired">
        <Portrait seed={row.contact.name} size={40} />
        <div class="who">
          <strong>{row.contact.name}</strong>
          <span class="role">{titleOf(row.contact.roleId)}</span>
          <span class="band">
            {bandFor(row.contact.competence).mark}
            {bandFor(row.contact.competence).label} · {formatMoney(row.contact.wage)} / Spieltag
          </span>
        </div>
        <Button doc="linkedout.dismiss" variant="ghost" label="Trennen"
                onclick={() => doDismiss(row.moduleId)} />

        <!--
          What they are handling, named.

          Without this the wage buys silence, and silence is what an empty
          department looks like too. Listing the items the player is NOT seeing
          is the only way the money reads as having bought anything.
        -->
        {#if items.length > 0}
          <ul class="handled">
            <li class="head">Wird gerade erledigt <Doc id="linkedout.handled" /></li>
            {#each items as item (item.id)}
              <li>{item.label}</li>
            {/each}
          </ul>
        {:else}
          <p class="quiet">Zurzeit nichts offen in dieser Abteilung.</p>
        {/if}
      </article>
    {/each}
  </Panel>
{/if}

<Panel title="Vorgeschlagene Kontakte" accent="europe" meta={`${lo.contacts.length} Profile`}>
  {#if lo.contacts.length === 0}
    <p class="empty">{copy.emptyTeam}</p>
  {:else}
    <ul class="feed">
      {#each lo.contacts as contact (contact.id)}
        <!-- docs-check-ignore: opens the documented hiring sheet -->
        <button class="card" class:locked={contact.locked} onclick={() => show(contact)}>
          {#if contact.locked}
            <span class="lock" aria-hidden="true">🔒</span>
          {:else}
            <Portrait seed={contact.name} size={36} />
          {/if}
          <span class="main">
            <span class="name">{contact.locked ? 'Premium-Kontakt' : contact.name}</span>
            <span class="role">{titleOf(contact.roleId)} · {categoryOf(contact.roleId)}</span>
            <span class="blurb">{contact.blurb}</span>
          </span>
          <span class="side">
            <!-- Band as glyph and word. A bar alone puts the whole judgement in
                 length and colour; this survives greyscale. -->
            <span class="band">{bandFor(contact.competence).mark} {bandFor(contact.competence).label}</span>
            <span class="wage tabular">{formatMoney(contact.wage)}</span>
            <span class="degree">{degreeLabel(contact.degree)}</span>
          </span>
        </button>
      {/each}
    </ul>
  {/if}
</Panel>

{#if pending.length > 0}
  <Panel title="Noch nicht übergebbar" accent="accent" meta="{pending.length} Abteilungen">
    <!--
      Shown rather than hidden, unlike an unearnable badge.

      A player planning a career should see what they will eventually be able to
      hand over — that is a roadmap. A badge you can never earn is a lie the
      list keeps telling; a department you cannot delegate YET is a plan.
    -->
    <p class="note">{copy.notDelegable} <Doc id="linkedout.pending" /></p>
    <ul class="pending">
      {#each pending as role (role.id)}
        <li>
          <strong>{role.title}</strong>
          <span>{role.takesOver}</span>
        </li>
      {/each}
    </ul>
  </Panel>
{/if}

{#if picked}
  <Sheet bind:open title={picked.locked ? 'Premium-Kontakt' : picked.name}>
    {@const band = bandFor(picked.competence)}
    <p class="sheet-role">{titleOf(picked.roleId)} · {categoryOf(picked.roleId)}</p>

    {#if picked.locked}
      <p class="pitch">{copy.premiumPitch}</p>
      <p class="fineprint">{copy.premiumSmallPrint} <Doc id="linkedout.premium" /></p>
    {:else}
      <p class="blurb">{picked.blurb}</p>

      <dl class="facts">
        <dt>Kompetenz <Doc id="linkedout.competence" /></dt>
        <dd>{band.mark} {band.label} — {band.means}</dd>
        <dt>Übernimmt</dt>
        <dd>{takesOver(picked.roleId)}</dd>
        <dt>Gehalt</dt>
        <dd class="tabular">{formatMoney(picked.wage)} pro Spieltag</dd>
      </dl>

      {#key picked.id}
        {@const check = canHire(lo, progression, picked, finance.money)}
        {#if check.ok}
          <Button doc="linkedout.hire" label="Einstellen — {formatMoney(picked.wage)}"
                  onclick={() => doHire(picked!)} />
        {:else}
          <p class="why" id="why-hire">{check.reason}</p>
          <Button doc="linkedout.hire" blocked describedBy="why-hire"
                  label="Einstellen — {formatMoney(picked.wage)}"
                  onclick={() => toast('Nicht möglich', check.reason, 'warn')} />
        {/if}
      {/key}
    {/if}
  </Sheet>
{/if}

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); }

  .hired {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    gap: var(--s3);
    padding: var(--s3) 0;
    border-bottom: 1px solid var(--border);
  }
  .hired:last-child { border-bottom: 0; }
  .who { display: grid; gap: 2px; min-width: 0; }
  .who .role { font-size: var(--fs-caption); color: var(--text-muted); }
  .who .band { font-size: var(--fs-caption); color: var(--text-dim); }

  .handled, .quiet { grid-column: 1 / -1; margin: var(--s2) 0 0; }
  .handled { list-style: none; padding: 0; display: grid; gap: var(--s1); }
  .handled li { font-size: var(--fs-caption); color: var(--text-muted); padding-left: var(--s3); }
  .handled li.head {
    padding-left: 0; color: var(--text-dim); font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
  }
  .quiet { font-size: var(--fs-caption); color: var(--text-dim); }

  .feed { list-style: none; margin: 0; padding: 0; display: grid; }
  .card {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: var(--s3); align-items: start;
    width: 100%; min-height: var(--tap);
    padding: var(--s3) 0;
    background: none; border: 0; border-bottom: 1px solid var(--border);
    font: inherit; text-align: left; cursor: pointer; color: var(--text-main);
  }
  .card:last-child { border-bottom: 0; }
  .main { display: grid; gap: 2px; min-width: 0; }
  .name { font-size: var(--fs-body); font-weight: 700; }
  .role { font-size: var(--fs-caption); color: var(--text-muted); }
  .blurb { font-size: var(--fs-caption); color: var(--text-dim); line-height: var(--lh-body); }
  .side { display: grid; gap: 2px; justify-items: end; text-align: right; }
  .side .band { font-size: var(--fs-caption); font-weight: 700; white-space: nowrap; }
  .wage { font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap; }
  .degree { font-size: 10px; color: var(--text-dim); white-space: nowrap; }

  /* The paywalled profile: visible, better than everything else, unreachable. */
  .card.locked .name { color: var(--text-dim); }
  .card.locked .blurb { filter: blur(3px); user-select: none; }
  .lock { font-size: 22px; text-align: center; opacity: .6; }

  .empty, .note {
    margin: 0; font-size: var(--fs-caption); color: var(--text-muted);
    line-height: var(--lh-body);
  }
  .pending { list-style: none; margin: var(--s3) 0 0; padding: 0; display: grid; gap: var(--s3); }
  .pending li { display: grid; gap: 2px; }
  .pending strong { font-size: var(--fs-body); color: var(--text-muted); }
  .pending span { font-size: var(--fs-caption); color: var(--text-dim); line-height: var(--lh-body); }

  .sheet-role { margin: 0 0 var(--s2); font-size: var(--fs-caption); color: var(--text-muted); }
  .pitch { margin: 0 0 var(--s2); font-size: var(--fs-body); }
  .fineprint { margin: 0; font-size: var(--fs-caption); color: var(--text-dim); }
  .facts { margin: var(--s3) 0 var(--s4); display: grid; gap: var(--s2); }
  .facts dt {
    font-size: var(--fs-caption); font-weight: 700; color: var(--text-dim);
    letter-spacing: .04em; text-transform: uppercase;
  }
  .facts dd { margin: 0; font-size: var(--fs-body); line-height: var(--lh-body); }
  .why { margin: 0 0 var(--s2); font-size: var(--fs-caption); color: var(--text-muted); }
</style>
