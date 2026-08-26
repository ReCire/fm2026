import { c as attr, e as escape_html, ab as bind_props, s as stringify, d as derived, a as ensure_array_like } from "./index.js";
import { u as doc } from "./Toast.svelte_svelte_type_style_lang.js";
import "./DataTable.svelte_svelte_type_style_lang.js";
function Sheet($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false, title, children } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="scrim svelte-185xwm9" role="presentation"></div> <div class="sheet svelte-185xwm9" role="dialog" aria-modal="true"${attr("aria-label", title)}><header class="svelte-185xwm9"><h3 class="svelte-185xwm9">${escape_html(title)}</h3> <button type="button" aria-label="Schließen" class="svelte-185xwm9">✕</button></header> <div class="body svelte-185xwm9">`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
function Doc($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { id } = $$props;
    const entry = derived(() => doc(id));
    let open = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (entry()) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<button class="doc-btn svelte-qfluqd" type="button"${attr("aria-label", `Erklärung: ${stringify(entry().label)}`)}>ⓘ</button> `);
        Sheet($$renderer3, {
          title: entry().label,
          get open() {
            return open;
          },
          set open($$value) {
            open = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="tip svelte-qfluqd">${escape_html(entry().tooltip)}</p> `);
            if (entry().why) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<h4 class="svelte-qfluqd">Warum es das gibt</h4> <p class="why svelte-qfluqd">${escape_html(entry().why)}</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (entry().related?.length) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<h4 class="svelte-qfluqd">Hängt zusammen mit</h4> <ul class="svelte-qfluqd"><!--[-->`);
              const each_array = ensure_array_like(entry().related);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let rel = each_array[$$index];
                $$renderer4.push(`<li>${escape_html(doc(rel)?.label ?? rel)}</li>`);
              }
              $$renderer4.push(`<!--]--></ul>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> `);
            if (entry().since) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<p class="since svelte-qfluqd">Seit Version ${escape_html(entry().since)}</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  Doc as D
};
