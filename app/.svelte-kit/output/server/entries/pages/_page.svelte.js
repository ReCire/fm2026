import { s as stringify, d as derived, a as ensure_array_like, b as attr_class, f as clsx, e as escape_html } from "../../chunks/index.js";
import { f as formatMoney, w as wageBill, t as teamStrength, a as attendance, c as capacity, b as canUndo, g as game, d as advance, p as popSnapshot, e as replaceGame, l as lastTick, r as registry, h as breakdown, m as matchdayNet } from "../../chunks/Toast.svelte_svelte_type_style_lang.js";
import { P as Panel } from "../../chunks/DataTable.svelte_svelte_type_style_lang.js";
import { B as Button } from "../../chunks/Button.js";
import { S as StatChip } from "../../chunks/StatChip.js";
import { f as fromEvent } from "../../chunks/toasts.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const finance = derived(() => game.modules.finance);
    const squad = derived(() => game.modules.squad);
    const stadium = derived(() => game.modules.stadium);
    const lastNet = derived(() => matchdayNet(finance(), game.meta.season, game.meta.matchday - 1));
    const lastBreakdown = derived(() => breakdown(finance(), game.meta.season, game.meta.matchday - 1));
    function playMatchday() {
      const result = advance("matchday");
      for (const e of result.events) fromEvent(e);
    }
    function undo() {
      const prev = popSnapshot();
      if (prev) replaceGame(prev);
    }
    Panel($$renderer2, {
      title: "Zentrale",
      accent: "accent",
      meta: `Saison ${stringify(game.meta.season)}`,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chips svelte-1uha8ag">`);
        StatChip($$renderer3, {
          label: "Vereins-Konto",
          value: formatMoney(finance().money),
          doc: "finance.balance",
          tone: finance().money < 0 ? "bad" : "good"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Transferbudget",
          value: formatMoney(finance().transferBudget),
          doc: "finance.transferBudget"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Gehälter / Spieltag",
          value: formatMoney(wageBill(squad())),
          doc: "squad.wage"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Teamstärke",
          value: teamStrength(squad()),
          doc: "squad.strength"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Zuschauer",
          value: attendance(stadium()).toLocaleString("de-DE"),
          doc: "stadium.attendance"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Kapazität",
          value: capacity(stadium()).toLocaleString("de-DE"),
          doc: "stadium.capacity"
        });
        $$renderer3.push(`<!----></div> <div class="actions svelte-1uha8ag">`);
        Button($$renderer3, { doc: "game.advance", onclick: playMatchday, explain: true });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          doc: "game.undo",
          variant: "ghost",
          onclick: undo,
          disabled: !canUndo()
        });
        $$renderer3.push(`<!----></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    if (lastTick.result) {
      $$renderer2.push("<!--[0-->");
      Panel($$renderer2, {
        title: "Spieltagsbericht",
        accent: "primary",
        meta: formatMoney(lastNet()),
        children: ($$renderer3) => {
          $$renderer3.push(`<ul class="events svelte-1uha8ag"><!--[-->`);
          const each_array = ensure_array_like(lastTick.result.events);
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let e = each_array[i];
            $$renderer3.push(`<li${attr_class(clsx(e.severity), "svelte-1uha8ag")}><strong class="svelte-1uha8ag">${escape_html(e.title)}</strong> `);
            if (e.detail) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="svelte-1uha8ag">${escape_html(e.detail)}</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--> `);
            if (e.amount !== void 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<em class="tabular svelte-1uha8ag">${escape_html(formatMoney(e.amount))}</em>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></li>`);
          }
          $$renderer3.push(`<!--]--></ul> <h4 class="svelte-1uha8ag">Nach Quelle</h4> <ul class="sources svelte-1uha8ag"><!--[-->`);
          const each_array_1 = ensure_array_like(lastBreakdown());
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let row = each_array_1[$$index_1];
            $$renderer3.push(`<li class="svelte-1uha8ag"><span>${escape_html(registry.byId.get(row.source)?.title ?? row.source)}</span> <em${attr_class("tabular svelte-1uha8ag", void 0, { "neg": row.amount < 0 })}>${escape_html(formatMoney(row.amount))}</em></li>`);
          }
          $$renderer3.push(`<!--]--></ul>`);
        }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
