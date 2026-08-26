import { e as escape_html, g as await_block, d as derived } from "../../../chunks/index.js";
import { r as registry } from "../../../chunks/Toast.svelte_svelte_type_style_lang.js";
import { p as page } from "../../../chunks/index2.js";
import { P as Panel } from "../../../chunks/DataTable.svelte_svelte_type_style_lang.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const id = derived(() => page.params.module ?? "");
    const mod = derived(() => registry.byId.get(id()));
    const screen = derived(() => mod()?.screen?.());
    if (!mod()) {
      $$renderer2.push("<!--[0-->");
      Panel($$renderer2, {
        title: "Unbekannter Bereich",
        accent: "danger",
        children: ($$renderer3) => {
          $$renderer3.push(`<p>Es gibt kein Modul mit der Kennung „${escape_html(id())}".</p>`);
        }
      });
    } else if (screen()) {
      $$renderer2.push("<!--[1-->");
      await_block(
        $$renderer2,
        screen(),
        () => {
          Panel($$renderer2, {
            title: mod().title,
            children: ($$renderer3) => {
              $$renderer3.push(`<p class="loading svelte-1lcnych">Lädt…</p>`);
            }
          });
        },
        (loaded) => {
          const Screen = loaded.default;
          if (Screen) {
            $$renderer2.push("<!--[-->");
            Screen($$renderer2, {});
            $$renderer2.push("<!--]-->");
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push("<!--]-->");
          }
        }
      );
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      Panel($$renderer2, {
        title: mod().title,
        children: ($$renderer3) => {
          $$renderer3.push(`<p>${escape_html(mod().summary)}</p>`);
        }
      });
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
