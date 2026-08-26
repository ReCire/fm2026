import { a as ensure_array_like, b as attr_class, s as stringify, e as escape_html, c as attr, d as derived } from "../../chunks/index.js";
import { r as registry, g as game, f as formatMoney } from "../../chunks/Toast.svelte_svelte_type_style_lang.js";
import { p as page } from "../../chunks/index2.js";
import { t as toasts } from "../../chunks/toasts.svelte.js";
function Toast($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="stack svelte-1fk2ial" aria-live="polite"><!--[-->`);
    const each_array = ensure_array_like(toasts.items);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let t = each_array[$$index];
      $$renderer2.push(`<button${attr_class(`toast ${stringify(t.severity)}`, "svelte-1fk2ial")} type="button"><strong class="svelte-1fk2ial">${escape_html(t.title)}</strong> `);
      if (t.detail) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="svelte-1fk2ial">${escape_html(t.detail)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    const groups = registry.nav();
    const primary = registry.primaryNav();
    const current = derived(() => page.url.pathname.split("/")[1] ?? "");
    let drawerOpen = false;
    $$renderer2.push(`<div class="app svelte-12qhfyh"><header class="svelte-12qhfyh"><button class="burger svelte-12qhfyh" aria-label="Menü">☰</button> <div class="brand svelte-12qhfyh"><span class="crest svelte-12qhfyh">A</span> <div><strong class="svelte-12qhfyh">FC Anstoß Pro</strong> <small class="svelte-12qhfyh">Saison ${escape_html(game.meta.season)} · Spieltag ${escape_html(game.meta.matchday)}</small></div></div> <div class="balance tabular svelte-12qhfyh">${escape_html(formatMoney(game.modules.finance.money))}</div></header> <div class="body svelte-12qhfyh"><nav${attr_class("sidebar svelte-12qhfyh", void 0, { "open": drawerOpen })}><!--[-->`);
    const each_array = ensure_array_like(groups);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let group = each_array[$$index_1];
      $$renderer2.push(`<p class="group svelte-12qhfyh">${escape_html(group.group)}</p> <!--[-->`);
      const each_array_1 = ensure_array_like(group.items);
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let m = each_array_1[$$index];
        $$renderer2.push(`<a${attr("href", `/${stringify(m.id)}`)}${attr_class("svelte-12qhfyh", void 0, { "active": current() === m.id })}><span aria-hidden="true">${escape_html(m.nav?.icon)}</span>${escape_html(m.title)}</a>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></nav> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <main class="svelte-12qhfyh">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div> <nav class="tabbar svelte-12qhfyh"><!--[-->`);
    const each_array_2 = ensure_array_like(primary);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let m = each_array_2[$$index_2];
      $$renderer2.push(`<a${attr("href", `/${stringify(m.id)}`)}${attr_class("svelte-12qhfyh", void 0, { "on": current() === m.id })}><span class="ico svelte-12qhfyh" aria-hidden="true">${escape_html(m.nav?.icon)}</span> <span class="lbl svelte-12qhfyh">${escape_html(m.title)}</span></a>`);
    }
    $$renderer2.push(`<!--]--> <button class="more svelte-12qhfyh"><span class="ico svelte-12qhfyh" aria-hidden="true">☰</span> <span class="lbl svelte-12qhfyh">Mehr</span></button></nav> `);
    Toast($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _layout as default
};
