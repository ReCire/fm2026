import { s as stringify, d as derived, a as ensure_array_like, e as escape_html, b as attr_class } from "./index.js";
import { g as game, h as breakdown, f as formatMoney } from "./Toast.svelte_svelte_type_style_lang.js";
import { P as Panel } from "./DataTable.svelte_svelte_type_style_lang.js";
import { S as StatChip } from "./StatChip.js";
import { D as DataTable } from "./DataTable.js";
function Screen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const finance = derived(() => game.modules.finance);
    const recent = derived(() => [...finance().ledger].reverse().slice(0, 40));
    const currentBreakdown = derived(() => breakdown(finance(), game.meta.season, game.meta.matchday - 1));
    Panel($$renderer2, {
      title: "Finanzen",
      accent: "accent",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chips svelte-1og4mny">`);
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
          label: "Gehaltsbudget",
          value: formatMoney(finance().wageBudget),
          doc: "finance.wageBudget"
        });
        $$renderer3.push(`<!----> `);
        StatChip($$renderer3, {
          label: "Restschuld",
          value: formatMoney(finance().loanDebt),
          doc: "finance.takeLoan",
          tone: finance().loanDebt > 0 ? "warn" : "neutral"
        });
        $$renderer3.push(`<!----></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    if (currentBreakdown().length) {
      $$renderer2.push("<!--[0-->");
      Panel($$renderer2, {
        title: "Letzter Spieltag",
        accent: "primary",
        children: ($$renderer3) => {
          $$renderer3.push(`<ul class="sources svelte-1og4mny"><!--[-->`);
          const each_array = ensure_array_like(currentBreakdown());
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let row = each_array[$$index];
            $$renderer3.push(`<li class="svelte-1og4mny"><span>${escape_html(row.source)}</span> <em${attr_class("tabular svelte-1og4mny", void 0, { "neg": row.amount < 0 })}>${escape_html(formatMoney(row.amount))}</em></li>`);
          }
          $$renderer3.push(`<!--]--></ul>`);
        }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    Panel($$renderer2, {
      title: "Buchungen",
      accent: "accent",
      meta: `${stringify(finance().ledger.length)} Einträge`,
      children: ($$renderer3) => {
        {
          let row = function($$renderer4, e) {
            $$renderer4.push(`<tr><td class="tabular dim svelte-1og4mny">${escape_html(e.season)}.${escape_html(e.matchday)}</td><td class="svelte-1og4mny">${escape_html(e.source)}</td><td class="dim svelte-1og4mny">${escape_html(e.reason)}</td><td${attr_class("tabular num svelte-1og4mny", void 0, { "neg": e.amount < 0 })}>${escape_html(formatMoney(e.amount))}</td></tr>`);
          };
          DataTable($$renderer3, {
            columns: [
              { key: "md", header: "ST" },
              { key: "source", header: "Quelle" },
              { key: "reason", header: "Grund" },
              { key: "amount", header: "Betrag", numeric: true }
            ],
            rows: recent(),
            empty: "Noch keine Buchungen — simuliere einen Spieltag.",
            row
          });
        }
      }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  Screen as default
};
