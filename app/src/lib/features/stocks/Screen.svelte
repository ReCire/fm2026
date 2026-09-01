<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, toast } from '$lib/ui';
  import { postToLedger, formatMoney } from '../finance/module';
  import { instruments, stocksContent, driverCopy, copy } from './content';
  import {
    priceOf, sharesOf, valueOf, portfolioValue, costToBuy, proceedsOf,
    buy, sell, unrealised, dividendFor
  } from './rules';
  import type { Instrument } from './content';

  /**
   * Depot — four prices that move, which is the whole repair.
   *
   * The prototype's never did: `stockMarket[key].price` was read three times
   * and assigned nowhere, so the market was a savings account with a ticker.
   * That means this screen's first duty is to make MOVEMENT visible — a number
   * that changed since last week has to look like it changed, or the fix is
   * invisible and the feature reads exactly as broken as it was.
   *
   * Hence a sparkline per row rather than a price and a percentage. A line is
   * the only way to see that the steady one is steady, which is the fact the
   * whole yield-against-volatility decision rests on.
   */

  const stocks = $derived(game.modules.stocks);
  const finance = $derived(game.modules.finance);

  const held = $derived(instruments.filter((i) => sharesOf(stocks, i.id) > 0));
  const total = $derived(portfolioValue(stocks));
  const open = $derived(unrealised(stocks));

  /** Last close against the one before it. `null` when there is no history yet. */
  function change(id: string): number | null {
    const h = stocks.history[id] ?? [];
    if (h.length < 2) return null;
    const now = h[h.length - 1]!;
    const before = h[h.length - 2]!;
    return before === 0 ? null : (now - before) / before;
  }

  const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)} %`;

  /**
   * A sparkline as an SVG path, scaled to its own range.
   *
   * To its OWN range, not to a shared one: these four trade between 45 € and
   * 210 €, so a common scale would flatten the cheapest into a straight line
   * and the point of the drawing is which of them is jumpy.
   */
  function spark(id: string): string {
    const h = stocks.history[id] ?? [];
    if (h.length < 2) return '';
    const lo = Math.min(...h);
    const hi = Math.max(...h);
    const span = hi - lo || 1;
    return h
      .map((v, i) => {
        const x = (i / (h.length - 1)) * 100;
        const y = 26 - ((v - lo) / span) * 24;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  function doBuy(i: Instrument) {
    const cost = costToBuy(stocks, i.id, 1);
    const result = buy(stocks, i.id, finance.money, 1);
    if (!result.ok) {
      toast('Kauf nicht möglich', result.reason, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'stocks',
      reason: `Kauf ${i.name}`,
      amount: -result.amount
    });
    toast('Gekauft', `${stocksContent.lotSize} Anteile ${i.name} für ${formatMoney(cost)}`, 'good');
  }

  function doSell(i: Instrument) {
    const result = sell(stocks, i.id, 1);
    if (!result.ok) {
      toast('Verkauf nicht möglich', result.reason, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'stocks',
      reason: `Verkauf ${i.name}`,
      amount: result.amount
    });
    toast('Verkauft', `${formatMoney(result.amount)} gutgeschrieben`, 'info');
  }
</script>

<Panel title={copy.holdings} accent="industry" meta={held.length > 0 ? `${held.length} Positionen` : undefined}>
  {#if held.length === 0}
    <p class="empty">{copy.empty}</p>
  {:else}
    <div class="chips">
      <StatChip label="Depotwert" value={formatMoney(total)} doc="stocks.market" />
      <StatChip
        label="Nicht realisiert"
        value={formatMoney(open)}
        tone={open > 0 ? 'good' : open < 0 ? 'bad' : 'neutral'}
        doc="stocks.market"
      />
      <StatChip
        label="Realisiert"
        value={formatMoney(stocks.realised)}
        tone={stocks.realised > 0 ? 'good' : stocks.realised < 0 ? 'bad' : 'neutral'}
        doc="stocks.market"
      />
      <StatChip
        label="Dividenden gesamt"
        value={formatMoney(stocks.dividendsPaid)}
        doc="stocks.dividend"
      />
      <StatChip label="Gebühren gesamt" value={formatMoney(stocks.feesPaid)} doc="stocks.market" />
    </div>
  {/if}
</Panel>

<Panel title={copy.market} accent="accent">
  <ul class="market">
    {#each instruments as i (i.id)}
      {@const price = priceOf(stocks, i.id)}
      {@const shares = sharesOf(stocks, i.id)}
      {@const ch = change(i.id)}
      {@const path = spark(i.id)}
      <li class="row" class:owned={shares > 0}>
        <div class="head">
          <div class="who">
            <strong>{i.name}</strong>
            <span class="sector">{i.sector}</span>
          </div>
          <div class="quote">
            <strong class="tabular">{formatMoney(price)}</strong>
            <!-- Sign, arrow and colour. The arrow is what survives greyscale,
                 and this is a screen where up and down is the entire content. -->
            {#if ch !== null}
              <span class="move tabular" class:up={ch > 0} class:down={ch < 0}>
                <i aria-hidden="true">{ch > 0 ? '▲' : ch < 0 ? '▼' : '■'}</i>
                {pct(ch)}
              </span>
            {:else}
              <span class="move dim">noch kein Kurs</span>
            {/if}
          </div>
        </div>

        {#if path}
          <svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} />
          </svg>
        {:else}
          <div class="spark placeholder"></div>
        {/if}

        <p class="driver">
          <strong>{driverCopy[i.driver].label}</strong> — {driverCopy[i.driver].note}
        </p>

        <div class="facts">
          <span>Dividende {(i.dividend * 100).toFixed(1)} % / Spieltag</span>
          <span>Schwankung {(i.volatility * 100).toFixed(0)} %</span>
          {#if shares > 0}
            <span class="pos">{shares} Anteile · {formatMoney(valueOf(stocks, i.id))}</span>
            <span>Dividende zuletzt {formatMoney(dividendFor(stocks, i.id))}</span>
          {/if}
        </div>

        <div class="actions">
          <!-- The cost WITH the fee, before the click. A price plus a fee the
               player only meets on the ledger is the same failure as a target
               nobody was shown. -->
          <Button
            doc="stocks.market"
            label="{stocksContent.lotSize} kaufen · {formatMoney(costToBuy(stocks, i.id, 1))}"
            onclick={() => doBuy(i)}
          />
          {#if shares >= stocksContent.lotSize}
            <Button
              doc="stocks.market"
              label="{stocksContent.lotSize} verkaufen · {formatMoney(proceedsOf(stocks, i.id, 1))}"
              onclick={() => doSell(i)}
            />
          {/if}
        </div>
      </li>
    {/each}
  </ul>
  <p class="rule">{copy.rule}</p>
  <p class="rule">{copy.fee} {copy.bonus}</p>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); margin: 0; padding: var(--s2) 0; }
  .rule { margin: var(--s2) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .market { list-style: none; display: grid; gap: var(--s2); margin: 0; padding: 0; }
  .row {
    display: grid;
    gap: var(--s1);
    padding: var(--s2);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
  }
  /* A position we hold gets a rail and a ground; the share count in `.facts`
     says it in words, so this is never the only channel. */
  .row.owned { border-left: 3px solid var(--industry); background: var(--bg-inset); }

  .head { display: flex; justify-content: space-between; gap: var(--s2); align-items: flex-start; }
  .who { display: grid; gap: 2px; min-width: 0; }
  .sector { font-size: var(--fs-caption); color: var(--text-muted); }
  .quote { display: grid; justify-items: end; gap: 2px; white-space: nowrap; }
  .move { font-size: var(--fs-caption); color: var(--text-muted); }
  .move.up { color: var(--pos-ink); font-weight: 700; }
  .move.down { color: var(--neg-ink); font-weight: 700; }
  .move.dim { font-style: italic; }

  .spark { width: 100%; height: 28px; display: block; }
  .spark path { fill: none; stroke: var(--primary); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .spark.placeholder { border-bottom: 1px dashed var(--border); }

  .driver { margin: 0; font-size: var(--fs-caption); color: var(--text-muted); }
  .driver strong { color: var(--text-main); }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s1) var(--s2);
    font-size: var(--fs-caption);
    color: var(--text-muted);
  }
  .facts .pos { color: var(--text-main); font-weight: 600; }

  .actions { display: flex; flex-wrap: wrap; gap: var(--s1); }
</style>
