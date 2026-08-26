import { s as stringify, a as ensure_array_like, e as escape_html, d as derived } from "./index.js";
import { c as capacity, a as attendance, n as attendanceFactor, f as formatMoney, o as ticketIncome, g as game, q as expansionQuote, s as post } from "./Toast.svelte_svelte_type_style_lang.js";
import { P as Panel } from "./DataTable.svelte_svelte_type_style_lang.js";
import { B as Button } from "./Button.js";
import { S as StatChip } from "./StatChip.js";
import { B as Bar } from "./Bar.js";
import { a as toast } from "./toasts.svelte.js";
function Screen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const stadium = derived(() => game.modules.stadium);
    const finance = derived(() => game.modules.finance);
    function expand(blockId) {
      const quote = expansionQuote(stadium(), blockId);
      if (!quote) return;
      if (finance().money < quote.cost) {
        toast("Zu teuer", `Es fehlen ${formatMoney(quote.cost - finance().money)}.`, "bad");
        return;
      }
      post(finance(), {
        season: game.meta.season,
        matchday: game.meta.matchday,
        source: "stadium",
        reason: `Ausbau ${stadium().blocks[blockId].name}`,
        amount: -quote.cost
      });
      stadium().blocks[blockId].cap += quote.seats;
      toast("Ausbau beauftragt", `+${quote.seats} Plätze`, "good");
    }
    Panel($$renderer2, {
      title: "Stadion",
      accent: "accent",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chips svelte-1xqyo4v">`);
        StatChip($$renderer3, {
          label: "Kapazität",
          value: capacity(stadium()).toLocaleString("de-DE"),
          doc: "stadium.capacity"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Zuschauer",
          value: attendance(stadium()).toLocaleString("de-DE"),
          doc: "stadium.attendance"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Auslastung",
          value: `${stringify(Math.round(attendanceFactor(stadium()) * 100))}%`,
          doc: "stadium.attendance"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Ticketerlös",
          value: formatMoney(ticketIncome(stadium())),
          doc: "stadium.ticketPrices"
        });
        $$renderer3.push(`<!----></div> <div class="fans svelte-1xqyo4v"><span>Fan-Zufriedenheit</span> `);
        Bar($$renderer3, { value: stadium().fans, label: "Fan-Zufriedenheit" });
        $$renderer3.push(`<!----></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Panel($$renderer2, {
      title: "Blöcke",
      accent: "primary",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="blocks svelte-1xqyo4v"><!--[-->`);
        const each_array = ensure_array_like(Object.entries(stadium().blocks));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let [id, block] = each_array[$$index];
          $$renderer3.push(`<div class="block svelte-1xqyo4v"><div class="head svelte-1xqyo4v"><strong class="svelte-1xqyo4v">${escape_html(block.name)}</strong> <span class="tabular svelte-1xqyo4v">${escape_html(block.cap.toLocaleString("de-DE"))}</span></div> <div class="comfort svelte-1xqyo4v"><span>🍺 ${escape_html(block.foodLvl)}</span> <span>👕 ${escape_html(block.merchLvl)}</span> <span>🚻 ${escape_html(block.toiletLvl)}</span></div> `);
          Button($$renderer3, {
            doc: "stadium.expand",
            variant: "secondary",
            label: `+${stringify(block.addSeats)} · ${stringify(formatMoney(block.cost))}`,
            disabled: finance().money < block.cost,
            onclick: () => expand(id)
          });
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  Screen as default
};
