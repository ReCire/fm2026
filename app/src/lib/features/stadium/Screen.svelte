<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Bar, Button, toast } from '$lib/ui';
  import { capacity, attendance, attendanceFactor, ticketIncome, expansionQuote } from './rules';
  import { formatMoney, post } from '../finance/rules';
  import StadiumBowl from '$lib/graphics/StadiumBowl.svelte';
  import { teamById } from '../league/rules';
  import { ownedEffects } from '../knowledge/rules';

  const stadium = $derived(game.modules.stadium);
  const finance = $derived(game.modules.finance);

  // Editor edits are applied to the league team itself now, so the team's own
  // name is already the edited one — no resolver in between.
  const clubName = $derived(
    teamById(game.modules.league, game.modules.league.playerClubId)?.name ?? 'Stadion'
  );

  /* Cheaper stands, from a doctrine. Read here rather than off the bus because
     building is a click, and the bus lives for exactly one tick. */
  const buildFactor = $derived(
    ownedEffects(game.modules.knowledge).factors.get('stadium.buildCost') ?? 1
  );
  const priceOf = (base: number) => Math.round(base * buildFactor);

  /* Which stands the account could expand today — the bowl marks them with a
     crane, the buttons below do the actual building. */
  const affordable = $derived(
    Object.entries(stadium.blocks)
      .filter(([, b]) => finance.money >= priceOf(b.cost))
      .map(([id]) => id)
  );

  function expand(blockId: string) {
    const quote = expansionQuote(stadium, blockId);
    if (!quote) return;
    const cost = priceOf(quote.cost);
    if (finance.money < cost) {
      toast('Zu teuer', `Es fehlen ${formatMoney(cost - finance.money)}.`, 'bad');
      return;
    }
    post(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'stadium',
      reason: `Ausbau ${stadium.blocks[blockId]!.name}`,
      amount: -cost
    });
    stadium.blocks[blockId]!.cap += quote.seats;
    toast('Ausbau beauftragt', `+${quote.seats} Plätze`, 'good');
  }
</script>

<!--
  The ground, before the numbers — and ONLY the ground.

  This panel used to show the whole site plan, which put the stadium in the
  middle of nineteen plots that belong to the campus page. The bowl alone
  says what the numbers below cannot: how big the club actually is. The
  stands' depth per side IS that side's capacity, so an expansion visibly
  thickens the wall it was bought for, and a crane marks any stand whose
  next step the account already covers.
-->
<Panel title={clubName} accent="primary" meta="{capacity(stadium).toLocaleString('de-DE')} Plätze">
  <StadiumBowl {stadium} {affordable} />
  <p class="legend">
    Die Dicke jeder Tribüne ist ihre Kapazität. 🏗️ heißt: Der nächste Ausbau dort ist
    aus dem Vereinskonto bezahlbar.
  </p>
</Panel>

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
          label="+{block.addSeats} · {formatMoney(priceOf(block.cost))}"
          disabled={finance.money < priceOf(block.cost)}
          onclick={() => expand(id)}
        />
      </div>
    {/each}
  </div>
</Panel>

<style>
  .legend { margin: var(--s3) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); }
  .fans { margin-top: var(--s3); font-size: var(--fs-caption); color: var(--text-muted); display: grid; gap: var(--s2); }
  .blocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--s2); }
  .block { background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--r-sm); padding: var(--s2); }
  .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s1); }
  .head strong { font-size: var(--fs-body); }
  .head span { color: var(--primary-ink); font-weight: 800; }
  /* Body size, not caption: at caption size the three emoji were squint
     material on a phone, and they are the only glanceable state the block has. */
  .comfort { display: flex; gap: var(--s3); font-size: var(--fs-body); color: var(--text-muted); margin-bottom: var(--s2); }
</style>
