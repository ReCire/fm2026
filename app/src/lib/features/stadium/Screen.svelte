<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Bar, Button, toast } from '$lib/ui';
  import { capacity, attendance, attendanceFactor, ticketIncome, expansionQuote } from './rules';
  import { formatMoney, post } from '../finance/rules';

  const stadium = $derived(game.modules.stadium);
  const finance = $derived(game.modules.finance);

  function expand(blockId: string) {
    const quote = expansionQuote(stadium, blockId);
    if (!quote) return;
    if (finance.money < quote.cost) {
      toast('Zu teuer', `Es fehlen ${formatMoney(quote.cost - finance.money)}.`, 'bad');
      return;
    }
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'stadium',
      reason: `Ausbau ${stadium.blocks[blockId]!.name}`,
      amount: -quote.cost
    });
    stadium.blocks[blockId]!.cap += quote.seats;
    toast('Ausbau beauftragt', `+${quote.seats} Plätze`, 'good');
  }
</script>

<Panel title="Stadion" accent="accent">
  <div class="chips">
    <StatChip label="Kapazität" value={capacity(stadium).toLocaleString('de-DE')} doc="stadium.capacity" />
    <StatChip label="Zuschauer" value={attendance(stadium).toLocaleString('de-DE')} doc="stadium.attendance" />
    <StatChip label="Auslastung" value="{Math.round(attendanceFactor(stadium) * 100)}%" doc="stadium.attendance" />
    <StatChip label="Ticketerlös" value={formatMoney(ticketIncome(stadium))} doc="stadium.ticketPrices" />
  </div>
  <div class="fans">
    <span>Fan-Zufriedenheit</span>
    <Bar value={stadium.fans} label="Fan-Zufriedenheit" />
  </div>
</Panel>

<Panel title="Blöcke" accent="primary">
  <div class="blocks">
    {#each Object.entries(stadium.blocks) as [id, block] (id)}
      <div class="block">
        <div class="head">
          <strong>{block.name}</strong>
          <span class="tabular">{block.cap.toLocaleString('de-DE')}</span>
        </div>
        <div class="comfort">
          <span>🍺 {block.foodLvl}</span>
          <span>👕 {block.merchLvl}</span>
          <span>🚻 {block.toiletLvl}</span>
        </div>
        <Button
          doc="stadium.expand"
          variant="secondary"
          label="+{block.addSeats} · {formatMoney(block.cost)}"
          disabled={finance.money < block.cost}
          onclick={() => expand(id)}
        />
      </div>
    {/each}
  </div>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); }
  .fans { margin-top: var(--s3); font-size: var(--fs-caption); color: var(--text-muted); display: grid; gap: var(--s2); }
  .blocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--s2); }
  .block { background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--r-sm); padding: var(--s2); }
  .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s1); }
  .head strong { font-size: var(--fs-body); }
  .head span { color: var(--primary-ink); font-weight: 800; }
  .comfort { display: flex; gap: var(--s2); font-size: var(--fs-caption); color: var(--text-muted); margin-bottom: var(--s2); }
</style>
