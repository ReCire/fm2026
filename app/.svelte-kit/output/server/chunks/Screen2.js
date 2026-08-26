import { s as stringify, d as derived, e as escape_html, b as attr_class } from "./index.js";
import { t as teamStrength, f as formatMoney, w as wageBill, g as game, i as rating, j as isAvailable, k as autoLineup } from "./Toast.svelte_svelte_type_style_lang.js";
import { P as Panel } from "./DataTable.svelte_svelte_type_style_lang.js";
import { B as Button } from "./Button.js";
import { B as Bar } from "./Bar.js";
import { a as toast } from "./toasts.svelte.js";
import { D as DataTable } from "./DataTable.js";
function Screen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const squad = derived(() => game.modules.squad);
    const sorted = derived(() => [...squad().players].sort((a, b) => rating(b) - rating(a)));
    const inLineup = (id) => squad().lineup.includes(id);
    function setLineup() {
      squad().lineup = autoLineup(squad());
      toast("Aufstellung gesetzt", `Teamstärke ${teamStrength(squad())}`, "good");
    }
    Panel($$renderer2, {
      title: "Kader",
      accent: "primary",
      meta: `${stringify(squad().players.length)} Spieler`,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="summary svelte-1kdzpma"><span>Teamstärke <strong class="tabular svelte-1kdzpma">${escape_html(teamStrength(squad()))}</strong></span> <span>Gehälter <strong class="tabular svelte-1kdzpma">${escape_html(formatMoney(wageBill(squad())))}</strong></span> <span>Aufgestellt <strong class="tabular svelte-1kdzpma">${escape_html(squad().lineup.length)} / 11</strong></span></div> `);
        Button($$renderer3, { doc: "squad.autoLineup", onclick: setLineup, explain: true });
        $$renderer3.push(`<!---->`);
      }
    });
    $$renderer2.push(`<!----> `);
    Panel($$renderer2, {
      title: "Spieler",
      accent: "accent",
      children: ($$renderer3) => {
        {
          let row = function($$renderer4, p) {
            $$renderer4.push(`<tr${attr_class("svelte-1kdzpma", void 0, { "starting": inLineup(p.id), "out": !isAvailable(p) })}><td class="svelte-1kdzpma">${escape_html(p.name)} `);
            if (inLineup(p.id)) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<span class="badge svelte-1kdzpma">Elf</span>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (p.injured > 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<span class="badge hurt svelte-1kdzpma">🚑 ${escape_html(p.injured)}</span>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (p.suspended > 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<span class="badge hurt svelte-1kdzpma">🟥 ${escape_html(p.suspended)}</span>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (p.trait !== "Kein") {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<small class="svelte-1kdzpma">${escape_html(p.trait)}</small>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></td><td class="dim svelte-1kdzpma">${escape_html(p.pos)}</td><td class="tabular num svelte-1kdzpma">${escape_html(p.strength)}</td><td class="fit svelte-1kdzpma">`);
            Bar($$renderer4, { value: p.fitness, label: `Fitness ${stringify(p.name)}` });
            $$renderer4.push(`<!----></td><td class="tabular num dim svelte-1kdzpma">${escape_html(formatMoney(p.wage))}</td></tr>`);
          };
          DataTable($$renderer3, {
            columns: [
              { key: "name", header: "Name" },
              { key: "pos", header: "Pos" },
              { key: "str", header: "Stärke", numeric: true },
              { key: "fit", header: "Fitness" },
              { key: "wage", header: "Gehalt", numeric: true }
            ],
            rows: sorted(),
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
