import { defineModule } from '$lib/engine/module';
import { IndustrySchema, createIndustry, INDUSTRY_VERSION } from './state';
import {
  driftPrices, produce, savingOf, outputOf, weeksOfStock,
  bankGoods, expireContracts, refreshContracts, canFulfil, goodsOf
} from './rules';
import { industryContent, factoryById } from './content';
import { merchContent } from '../merch/content';
import { postToLedger } from '../finance/module';
import { gatedBy } from '../progression/rules';

/** What a unit would cost bought in, which is the number a factory competes with. */
const wholesaleOf = (itemId: string) =>
  merchContent.items.find((i) => i.id === itemId)?.cost ?? 0;

export default defineModule({
  id: 'industry',
  title: 'Industrie',
  summary: 'Rohstoffe, Fabriken, und die Frage, ob sich eigene Produktion lohnt.',
  nav: { group: 'Wirtschaft', icon: '🏭', order: 30 },
  requires: ['finance', 'merch'],
  gate: gatedBy('industry'),

  state: { schema: IndustrySchema, create: createIndustry, version: INDUSTRY_VERSION },

  attention: (state) => {
    const industry = state.modules.industry;
    const items = [];

    /*
     * A plant standing still is the one thing here genuinely waiting on a
     * decision: it has been bought, it is depreciating, and it is producing
     * nothing because nobody bought cotton. Everything else on this screen is
     * an opportunity rather than a problem, and opportunities do not get badges.
     */
    const idle = industryContent.factories
      .filter((f) => outputOf(industry, f) > 0 && weeksOfStock(industry, f) < 1);
    if (idle.length > 0) {
      items.push({
        id: 'industry.idle',
        urgency: 'now' as const,
        label: idle.length === 1
          ? `${idle[0]!.name} steht still — kein Rohstoff im Lager`
          : `${idle.length} Fabriken stehen still — kein Rohstoff im Lager`
      });
    }

    /* An order you can already fill is money sitting on the desk, and it
       expires. That is a decision waiting; an order you cannot fill is not. */
    const ready = industry.contracts.filter((c) => goodsOf(industry, c.item) >= c.units);
    if (ready.length > 0) {
      items.push({
        id: 'industry.ready',
        urgency: 'now' as const,
        label: ready.length === 1
          ? `Auftrag von ${ready[0]!.club} ist lieferbar`
          : `${ready.length} Aufträge sind lieferbar`
      });
    }
    return items;
  },

  hooks: {
    /*
     * Production runs on the week, not the matchday.
     *
     * A factory's week is a week; tying it to a fixture would mean the plants
     * stopped over the winter break. It also keeps the matchday tick about
     * football, which is the reason `week` exists at all.
     */
    week: {
      phase: 'economy',
      order: 20,
      consumes: ['industry.output', 'industry.materialUse', 'industry.materialPrice'],
      run({ state, rng, emit, factor }) {
        const industry = state.modules.industry;

        driftPrices(industry, rng);

        // The desk ages first, so a contract accepted this week is not one that
        // was already gone when the player looked at it.
        const lapsed = expireContracts(industry);
        refreshContracts(industry, rng);
        for (const c of lapsed) {
          emit({
            source: 'industry',
            severity: 'warn',
            title: `Auftrag verfallen: ${c.club}`,
            detail: `${c.units} × ${c.item} — nicht rechtzeitig geliefert.`,
            goto: 'industry'
          });
        }

        const batches = produce(industry, wholesaleOf, {
          output: factor('industry.output'),
          materialUse: factor('industry.materialUse')
        });
        industry.lastRun = batches.map((b) => ({
          factoryId: b.factoryId, units: b.units,
          materialCost: b.materialCost, wholesale: b.wholesale
        }));
        if (batches.length === 0) return;

        /*
         * Into finished goods, not onto the shop shelf.
         *
         * The shop sells about nineteen units a week at a Liga-4 crowd; the
         * plants make hundreds. Pushing production straight into `merch` would
         * bury a fan shop under scarves and turn the whole feature into a
         * machine for converting money into unsellable stock. Measured before
         * it shipped, which is the only reason it did not.
         */
        bankGoods(industry, batches);

        const cost = batches.reduce((sum, b) => sum + b.materialCost, 0);
        const saved = savingOf(batches);
        industry.saved += saved;

        postToLedger(state.modules.finance, {
          season: state.meta.season,
          matchday: state.meta.matchday,
          source: 'industry',
          reason: 'Produktionskosten',
          amount: -cost
        });

        const units = batches.reduce((sum, b) => sum + b.units, 0);
        emit({
          source: 'industry',
          severity: saved > 0 ? 'good' : 'warn',
          title: `${units} Einheiten produziert`,
          // The saving, not the cost, because the cost alone reads as a loss
          // and the entire question this feature answers is what it replaced.
          detail: saved > 0
            ? `${saved.toLocaleString('de-DE')} € günstiger als eingekauft.`
            : 'Teurer als der Einkauf — die Rohstoffpreise stehen ungünstig.',
          amount: -cost,
          goto: 'industry'
        });
      }
    }
  }
});

export { factoryById };
