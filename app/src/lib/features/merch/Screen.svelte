<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import Doc from '$lib/docs/Doc.svelte';
  import { post, formatMoney } from '../finance/rules';
  import { elasticity, itemDef, restockQuote, restock, setPrice } from './rules';
  import { merchContent } from './content';

  const merch = $derived(game.modules.merch);
  const finance = $derived(game.modules.finance);

  const totalRevenue = $derived(
    Object.values(merch.items).reduce((sum, i) => sum + i.lastSales.revenue, 0)
  );
  const totalUnits = $derived(
    Object.values(merch.items).reduce((sum, i) => sum + i.lastSales.units, 0)
  );

  const TONE: Record<string, 'neutral' | 'good' | 'bad' | 'warn'> = {
    cheap: 'neutral',
    low: 'neutral',
    optimal: 'good',
    expensive: 'warn',
    overpriced: 'bad'
  };

  function changePrice(itemId: string, value: string) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    setPrice(merch, itemId, parsed);
  }

  function buyStock(itemId: string) {
    const quote = restockQuote(itemId);
    if (!quote) return;
    if (finance.money < quote.cost) {
      toast('Zu teuer', `Es fehlen ${formatMoney(quote.cost - finance.money)}.`, 'bad');
      return;
    }
    const result = restock(merch, itemId);
    if (!result) return;
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'merch',
      reason: `Nachbestellung ${itemDef(itemId)?.name ?? itemId}`,
      amount: -result.cost
    });
    toast('Nachbestellt', `+${result.qty} Stück — ${formatMoney(result.cost)}`, 'good');
  }
</script>

<Panel title="Fanshop" accent="accent">
  <div class="chips">
    <StatChip label="Umsatz letzter Spieltag" value={formatMoney(totalRevenue)} doc="merch.revenue" />
    <StatChip label="Verkauft letzter Spieltag" value={totalUnits.toLocaleString('de-DE')} doc="merch.revenue" />
  </div>
</Panel>

<Panel title="Artikel" accent="primary">
  <p class="hint">Vier Artikel im Fanshop <Doc id="merch.catalogue" /></p>
  <div class="items">
    {#each merchContent.items as def (def.id)}
      {@const item = merch.items[def.id]}
      {#if item}
        {@const el = elasticity(item.price, def.optimalPrice)}
        <div class="item">
          <div class="head">
            <strong>{def.name}</strong>
            <span class="tabular">{item.stock.toLocaleString('de-DE')} Stk. am Lager</span>
          </div>

          <div class="price-row">
            <label for="price-{def.id}">Preis <Doc id="merch.price" /></label>
            <!-- docs-check-ignore: a number field is not a documented control; the label and the doc icon beside it are -->
            <input
              id="price-{def.id}"
              type="number"
              min="1"
              value={item.price}
              onchange={(e) => changePrice(def.id, e.currentTarget.value)}
            />
            <span>€</span>
          </div>

          <StatChip label="Marktlage" value={el.label} tone={TONE[el.tone]} doc="merch.price" />

          <div class="sales">
            <strong>Letzter Spieltag: {item.lastSales.units} Stk. (+{formatMoney(item.lastSales.revenue)})</strong>
            {#if item.lastSales.missed > 0}
              <p class="missed">{item.lastSales.missed} Kunden gingen wegen Lagermangel leer aus.</p>
            {/if}
          </div>

          <Button
            doc="merch.restock"
            variant="secondary"
            label="+{def.restockBatch} nachbestellen · {formatMoney(def.cost * def.restockBatch)}"
            disabled={finance.money < def.cost * def.restockBatch}
            onclick={() => buyStock(def.id)}
          />
        </div>
      {/if}
    {/each}
  </div>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .hint { font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); display: flex; align-items: center; }

  .items { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--s2); }
  .item {
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: var(--s2);
    display: grid;
    gap: var(--s2);
  }
  .head { display: flex; justify-content: space-between; align-items: baseline; }
  .head span { color: var(--primary-ink); font-weight: 800; }

  .price-row { display: flex; align-items: center; gap: var(--s1); font-size: var(--fs-caption); }
  .price-row label { display: flex; align-items: center; color: var(--text-muted); }
  .price-row input {
    width: 5ch;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text-main);
    padding: 2px 4px;
  }

  .sales { font-size: var(--fs-caption); color: var(--text-muted); }
  .missed { color: var(--neg-ink); margin: 2px 0 0; font-weight: 700; }
</style>
