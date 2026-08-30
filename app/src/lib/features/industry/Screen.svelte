<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import { postToLedger, formatMoney } from '../finance/module';
  import { merchContent } from '../merch/content';
  import { industryContent, materialById } from './content';
  import {
    warehouseCapacity, storedTotal, spaceLeft, levelOf, owns, maxLevel,
    nextCost, outputOf, buyQuote, buyMaterial, weeksOfStock, canUpgradeWarehouse,
    goodsOf, canFulfil, fulfil, toShop
  } from './rules';

  const industry = $derived(game.modules.industry);
  const finance = $derived(game.modules.finance);

  const capacity = $derived(warehouseCapacity(industry));
  const stored = $derived(storedTotal(industry));
  const savedTotal = $derived(Math.round(industry.saved));

  /* The wholesale price a factory competes with. Shown beside every plant,
     because "is this worth owning" is not answerable without it. */
  const wholesale = (itemId: string) =>
    merchContent.items.find((i) => i.id === itemId)?.cost ?? 0;
  const itemName = (itemId: string) =>
    merchContent.items.find((i) => i.id === itemId)?.name ?? itemId;

  /** Cost per unit at today's prices — the number to compare with wholesale. */
  function unitCost(factoryId: string): number {
    const f = industryContent.factories.find((x) => x.id === factoryId)!;
    const price = industry.materials[f.material]?.price ?? 0;
    return Math.round(price * f.perUnit * 100) / 100;
  }

  let amounts = $state<Record<string, number>>({});
  const wanted = (id: string) => amounts[id] ?? 250;

  function buy(materialId: string) {
    const quote = buyQuote(industry, materialId, wanted(materialId));
    if (quote.units === 0) return toast('Lager voll', 'Kein Platz mehr im Lager.', 'warn');
    if (quote.cost > finance.money) return toast('Zu teuer', 'Das Vereinskonto gibt das nicht her.', 'warn');

    buyMaterial(industry, materialId, quote.units);
    postToLedger(finance, {
      season: game.meta.season, matchday: game.meta.matchday,
      source: 'industry', reason: `Rohstoff: ${materialById(materialId)?.name ?? materialId}`,
      amount: -quote.cost
    });
    toast(
      `${quote.units} ${materialById(materialId)?.unit ?? ''} gekauft`,
      quote.limitedBySpace ? 'Auf den freien Lagerplatz gekürzt.' : formatMoney(quote.cost),
      'good'
    );
  }

  function deliver(contractId: string) {
    const c = industry.contracts.find((x) => x.id === contractId);
    if (!c) return;
    const payout = fulfil(industry, c);
    if (payout === undefined) return toast('Nicht lieferbar', 'Es liegt noch nicht genug fertige Ware im Lager.', 'warn');
    postToLedger(finance, {
      season: game.meta.season, matchday: game.meta.matchday,
      source: 'industry', reason: `Auftrag: ${c.club}`, amount: payout
    });
    toast('Geliefert', `${c.club} zahlt ${formatMoney(payout)}.`, 'good');
  }

  function shelve(itemId: string, units: number) {
    const moved = toShop(industry, itemId, units);
    if (moved === 0) return;
    const item = game.modules.merch.items[itemId];
    if (item) item.stock += moved;
    const def = merchContent.items.find((i) => i.id === itemId);
    toast(
      `${moved} Stück ins Regal`,
      `Einkauf gespart: ${formatMoney(moved * (def?.cost ?? 0))}.`,
      'good'
    );
  }

  function expand(factoryId: string) {
    const f = industryContent.factories.find((x) => x.id === factoryId)!;
    const cost = nextCost(industry, f);
    if (cost === undefined) return;
    if (cost > finance.money) return toast('Zu teuer', 'Das Vereinskonto gibt das nicht her.', 'warn');

    industry.factories[f.id] = levelOf(industry, f.id) + 1;
    postToLedger(finance, {
      season: game.meta.season, matchday: game.meta.matchday,
      source: 'industry', reason: `Ausbau: ${f.name}`, amount: -cost
    });
    toast(f.name, owns(industry, f.id) ? 'Ausgebaut.' : 'Gekauft.', 'good');
  }

  function upgradeWarehouse() {
    const cost = industryContent.warehouseUpgradeCost;
    if (!canUpgradeWarehouse(industry)) return;
    if (cost > finance.money) return toast('Zu teuer', 'Das Vereinskonto gibt das nicht her.', 'warn');
    industry.warehouseLevel += 1;
    postToLedger(finance, {
      season: game.meta.season, matchday: game.meta.matchday,
      source: 'industry', reason: 'Lagerausbau', amount: -cost
    });
    toast('Lager ausgebaut', `${warehouseCapacity(industry).toLocaleString('de-DE')} Einheiten Platz.`, 'good');
  }
</script>

<Panel title="Industrie" accent="industry" meta="{industryContent.factories.filter((f) => owns(industry, f.id)).length} von {industryContent.factories.length}">
  <p class="intro">
    Andere Vereine bestellen in Tausenden — davon lebt eine Fabrik. Der eigene
    Fanshop nimmt nebenbei ab, was er verkaufen kann, und spart dabei den
    Einkaufspreis. <Doc id="industry.why" />
  </p>
  <div class="chips">
    <StatChip label="Gespart gegenüber Einkauf" value={formatMoney(savedTotal)} doc="industry.why"
              tone={savedTotal > 0 ? 'good' : savedTotal < 0 ? 'bad' : 'neutral'} />
    <StatChip label="Lager" value="{stored.toLocaleString('de-DE')} / {capacity.toLocaleString('de-DE')}"
              doc="industry.warehouse" tone={spaceLeft(industry) === 0 ? 'bad' : 'neutral'} />
  </div>
  <Bar value={stored} max={capacity} label="Lagerauslastung" showValue />
  {#if canUpgradeWarehouse(industry)}
    <Button doc="industry.warehouse" variant="secondary"
            label="Lager ausbauen · {formatMoney(industryContent.warehouseUpgradeCost)}"
            disabled={finance.money < industryContent.warehouseUpgradeCost}
            onclick={upgradeWarehouse} />
  {/if}
</Panel>

<Panel title="Aufträge" accent="industry" meta="{industry.contracts.length} auf dem Tisch">
  <p class="intro">
    Der Fanshop verkauft rund zwanzig Stück pro Woche. Andere Vereine bestellen
    in Tausenden — das ist der Grund, eine Fabrik zu besitzen. <Doc id="industry.contracts" />
  </p>
  {#if industry.contracts.length === 0}
    <p class="stock">Zurzeit liegt nichts an.</p>
  {:else}
    <ul class="materials">
      {#each industry.contracts as c (c.id)}
        {@const have = goodsOf(industry, c.item)}
        <li>
          <div class="head">
            <strong>{c.club}</strong>
            <span class="price tabular">{formatMoney(c.payout)}</span>
          </div>
          <p class="stock">
            {c.units.toLocaleString('de-DE')} × {itemName(c.item)} ·
            {have.toLocaleString('de-DE')} fertig · läuft in {c.expiresIn} Woche(n) ab
          </p>
          {#if canFulfil(industry, c)}
            <Button doc="industry.fulfil" label="Liefern · {formatMoney(c.payout)}"
                    onclick={() => deliver(c.id)} />
          {:else}
            <p class="idle">Noch {(c.units - have).toLocaleString('de-DE')} Stück zu wenig.</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<Panel title="Fertiglager" accent="industry">
  <p class="intro">
    Fertige Ware wartet hier auf einen Abnehmer. Ins Regal des Fanshops kostet
    sie nichts — dort hättest du sonst den Einkaufspreis bezahlt. <Doc id="industry.goods" />
  </p>
  <ul class="materials">
    {#each merchContent.items as item (item.id)}
      {@const have = goodsOf(industry, item.id)}
      <li>
        <div class="head">
          <strong>{item.name}</strong>
          <span class="price tabular">{have.toLocaleString('de-DE')} Stk.</span>
        </div>
        {#if have > 0}
          <Button doc="industry.toShop" variant="secondary"
                  label="{Math.min(have, item.restockBatch)} in den Fanshop · spart {formatMoney(Math.min(have, item.restockBatch) * item.cost)}"
                  onclick={() => shelve(item.id, item.restockBatch)} />
        {/if}
      </li>
    {/each}
  </ul>
</Panel>

<Panel title="Rohstoffmarkt" accent="industry">
  <p class="intro">{industryContent.weeklyDrift * 100}% Bewegung pro Woche, mit Rückzug zum Basispreis. <Doc id="industry.market" /></p>
  <ul class="materials">
    {#each industryContent.materials as m (m.id)}
      {@const entry = industry.materials[m.id]}
      {#if entry}
        <li>
          <div class="head">
            <strong>{m.name}</strong>
            <span class="price tabular">{entry.price.toFixed(2)} €/{m.unit}</span>
            <!-- Glyph and sign, not colour alone: a price move has to read in
                 greyscale, and this is the most-scanned number on the screen. -->
            <span class="delta tabular" class:up={entry.delta > 0} class:down={entry.delta < 0}>
              {entry.delta > 0 ? '▲' : entry.delta < 0 ? '▼' : '■'}
              {entry.delta > 0 ? '+' : ''}{entry.delta.toFixed(2)}
            </span>
          </div>
          <p class="stock">{entry.stock.toLocaleString('de-DE')} {m.unit} im Lager · Basis {m.basePrice.toFixed(2)} €</p>
          <div class="buy">
            <label class="qty" for="qty-{m.id}">Menge</label>
            <!-- docs-check-ignore: quantity field; the documented control is industry.buy -->
            <input id="qty-{m.id}" type="number" min="0" step="50" value={wanted(m.id)}
                   oninput={(e) => (amounts[m.id] = Math.max(0, Number(e.currentTarget.value)))} />
            <Button doc="industry.buy" variant="secondary"
                    label="Kaufen · {formatMoney(buyQuote(industry, m.id, wanted(m.id)).cost)}"
                    disabled={buyQuote(industry, m.id, wanted(m.id)).cost > finance.money}
                    onclick={() => buy(m.id)} />
          </div>
        </li>
      {/if}
    {/each}
  </ul>
</Panel>

{#each industryContent.factories as f (f.id)}
  {@const level = levelOf(industry, f.id)}
  {@const cost = nextCost(industry, f)}
  {@const per = unitCost(f.id)}
  {@const buy_ = wholesale(f.produces)}
  <Panel title={f.name} accent={level >= 0 ? 'industry' : 'accent'}
         meta={level >= 0 ? `Stufe ${level + 1} von ${maxLevel(f) + 1}` : 'nicht gekauft'}>
    <p class="blurb">{f.blurb}</p>

    <!-- The comparison IS the feature. Both numbers, side by side, always. -->
    <div class="compare">
      <span class="col"><em>Herstellung</em><b class="tabular" class:good={per < buy_}>{per.toFixed(2)} €</b></span>
      <span class="col"><em>Einkauf</em><b class="tabular">{buy_.toFixed(2)} €</b></span>
      <span class="col"><em>pro {itemName(f.produces)}</em>
        <b class="tabular" class:good={per < buy_} class:bad={per >= buy_}>
          {per < buy_ ? '−' : '+'}{Math.abs(buy_ - per).toFixed(2)} €
        </b>
      </span>
    </div>

    {#if level >= 0}
      <p class="stock">
        {outputOf(industry, f)} Stück/Woche · Rohstoff reicht für {weeksOfStock(industry, f)} Woche(n)
      </p>
      {#if weeksOfStock(industry, f) < 1}
        <p class="idle">Steht still — kein {materialById(f.material)?.name} im Lager.</p>
      {/if}
    {/if}

    {#if cost !== undefined}
      <Button doc="industry.expand"
              label="{level < 0 ? 'Kaufen' : 'Ausbauen'} · {formatMoney(cost)}"
              disabled={finance.money < cost}
              onclick={() => expand(f.id)} />
    {:else}
      <p class="stock">Vollständig ausgebaut.</p>
    {/if}
  </Panel>
{/each}

<style>
  .intro { color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-body); margin-bottom: var(--s3); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
  .blurb { color: var(--text-muted); font-size: var(--fs-caption); line-height: var(--lh-body); margin-bottom: var(--s3); }
  .stock { color: var(--text-dim); font-size: var(--fs-caption); margin: var(--s2) 0; }
  .idle { color: var(--neg-ink); font-size: var(--fs-caption); margin-bottom: var(--s2); }

  .materials { list-style: none; margin: 0; padding: 0; }
  .materials li { padding: var(--s3) 0; border-bottom: 1px solid var(--border); }
  .materials li:last-child { border-bottom: 0; }
  .head { display: flex; align-items: baseline; gap: var(--s2); }
  .head strong { flex: 1; font-size: var(--fs-body); color: var(--text-main); }
  .price { font-family: var(--font-num); color: var(--text-main); }
  .delta { font-family: var(--font-num); font-size: var(--fs-caption); color: var(--text-dim); }
  .delta.up { color: var(--neg-ink); }
  .delta.down { color: var(--pos-ink); }

  .buy { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; }
  .qty { font-size: var(--fs-caption); color: var(--text-muted); }
  .buy input {
    width: 6rem; min-height: var(--tap); font: inherit; font-size: var(--fs-caption);
    color: var(--text-main); background: var(--bg-inset);
    border: 1px solid var(--border); border-radius: var(--r-sm); padding: 0 var(--s2);
  }

  .compare { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s2); margin-bottom: var(--s3); }
  .col { display: flex; flex-direction: column; gap: 2px; }
  .col em { font-style: normal; font-size: var(--fs-caption); color: var(--text-muted); }
  .col b { font-size: var(--fs-body); color: var(--text-main); }
  .col b.good { color: var(--pos-ink); }
  .col b.bad { color: var(--neg-ink); }
  .tabular { font-variant-numeric: tabular-nums; }
</style>
