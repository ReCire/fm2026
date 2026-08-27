<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import { employed, available, wageBill, canHire, hire, dismiss, contributions } from './rules';
  import { describeEffect, type StaffRole } from './content';
  import { formatMoney, post } from '../finance/rules';

  const staff = $derived(game.modules.staff);
  const finance = $derived(game.modules.finance);
  const onStaff = $derived(employed(staff));
  const openRoles = $derived(available(staff));
  const bill = $derived(wageBill(staff));

  /*
   * Grouped by the value they move, not by the person who moves it.
   *
   * The player's question is "what is my backroom doing", not "who is on the
   * payroll" — and two people touching the same number is the case that is
   * impossible to work out from a list of names. Naming the source beside each
   * line is the part that matters: an effect the player cannot attribute to a
   * decision is one they will not repeat on purpose.
   */
  const byKey = $derived.by(() => {
    const out = new Map<string, { text: string; from: string }[]>();
    for (const c of contributions(staff)) {
      const text = describeEffect({ key: c.key, factor: c.factor, add: c.add });
      if (!text) continue;
      const list = out.get(c.key) ?? [];
      list.push({ text, from: c.from });
      out.set(c.key, list);
    }
    return [...out.values()].flat();
  });

  function take(role: StaffRole) {
    const check = canHire(staff, role.id, finance.money);
    if (!check.ok) {
      toast('Nicht möglich', check.reason ?? 'Diese Verpflichtung geht nicht.', 'bad');
      return;
    }
    post(finance, {
      season: game.meta.season, matchday: game.meta.matchday,
      source: 'staff', reason: `Verpflichtung ${role.name}`, amount: -role.cost
    });
    hire(staff, role.id, game.meta.matchday);
    toast(`${role.name} verpflichtet`, `${formatMoney(role.wage)} pro Spieltag`, 'good');
  }

  function release(role: StaffRole) {
    dismiss(staff, role.id);
    toast(`${role.name} freigestellt`, 'Das Gehalt entfällt ab dem nächsten Spieltag.', 'warn');
  }
</script>

<Panel title="Trainerstab" accent="accent">
  <div class="chips">
    <StatChip label="Im Stab" value={onStaff.length} doc="staff.headcount" />
    <StatChip label="Gehälter / Spieltag" value={formatMoney(bill)} doc="staff.wageBill" tone={bill > 0 ? 'warn' : 'neutral'} />
  </div>
</Panel>

<Panel title="Was dein Stab bewirkt" accent="primary">
  <span class="lead">Jede Wirkung mit der Person, die sie verursacht <Doc id="staff.effects" /></span>
  {#if byKey.length}
    <ul class="effects">
      {#each byKey as e, i (e.from + i)}
        <li><span class="what">{e.text}</span><span class="who">{e.from}</span></li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Noch niemand verpflichtet. Der Stab ist die günstigste dauerhafte Verbesserung im Verein — und die einzige, die auch dann arbeitet, wenn du gerade woanders bist.</p>
  {/if}
</Panel>

{#if onStaff.length}
  <Panel title="Angestellt">
    {#each onStaff as role (role.id)}
      <div class="row is-on">
        <div class="meta">
          <strong>{role.name}</strong>
          <small>{role.blurb}</small>
          <small class="fx">{role.effects.map(describeEffect).filter(Boolean).join(' · ')}</small>
        </div>
        <div class="side">
          <span class="wage">{formatMoney(role.wage)}<small>/SpT</small></span>
          <Button doc="staff.dismiss" variant="ghost" onclick={() => release(role)} />
        </div>
      </div>
    {/each}
  </Panel>
{/if}

<Panel title="Verfügbar">
  {#each openRoles as role (role.id)}
    {@const check = canHire(staff, role.id, finance.money)}
    <div class="row" class:short={!check.ok}>
      <div class="meta">
        <strong>{role.name}</strong>
        <small>{role.blurb}</small>
        <!-- The effect is stated before the price, not after: what it does is
             the reason to consider it, the cost is only the reason to hesitate. -->
        <small class="fx">{role.effects.map(describeEffect).filter(Boolean).join(' · ')}</small>
      </div>
      <div class="side">
        <span class="cost">{formatMoney(role.cost)}<small>einmalig</small></span>
        <span class="wage">{formatMoney(role.wage)}<small>/SpT</small></span>
        <Button doc="staff.hire" onclick={() => take(role)} />
      </div>
    </div>
  {/each}
  {#if !openRoles.length}
    <p class="muted">Jede Stelle ist besetzt.</p>
  {/if}
</Panel>

<style>
  .chips { display: flex; gap: var(--s2); flex-wrap: wrap; }
  .lead { display: block; font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }

  .effects { list-style: none; padding: 0; margin: 0; }
  .effects li {
    display: flex; justify-content: space-between; align-items: baseline; gap: var(--s3);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border);
  }
  .effects li:last-child { border-bottom: 0; }
  .what { color: var(--text-main); font-size: var(--fs-body); }
  /* The source is secondary but never omitted — an effect nobody can attribute
     is one the player cannot decide to keep. */
  .who { color: var(--text-dim); font-size: var(--fs-caption); white-space: nowrap; }

  .row {
    display: flex; gap: var(--s3); align-items: flex-start; justify-content: space-between;
    padding: var(--s3) 0; border-bottom: 1px solid var(--border);
  }
  .row:last-child { border-bottom: 0; }
  .row.short { opacity: 0.6; }
  .meta { min-width: 0; }
  .meta strong { display: block; font-size: var(--fs-body); color: var(--text-main); }
  .meta small { display: block; font-size: var(--fs-caption); color: var(--text-muted); margin-top: 2px; }
  .meta .fx { color: var(--primary-ink); }

  .side { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: none; }
  .cost, .wage {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-caption); color: var(--text-muted); white-space: nowrap;
  }
  .cost small, .wage small { color: var(--text-dim); margin-left: 3px; }
  .muted { color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-body); }
</style>
