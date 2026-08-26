import { b as attr_class, c as attr, e as escape_html, d as derived, s as stringify } from "./index.js";
import { u as doc, v as docLabel } from "./Toast.svelte_svelte_type_style_lang.js";
import { D as Doc } from "./Doc.js";
import "./DataTable.svelte_svelte_type_style_lang.js";
function Button($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      /**
       * Doc id. Required — a control with no documentation does not ship.
       * `npm run docs:check` enforces this at build time.
       */
      doc: docId,
      variant = "primary",
      disabled = false,
      label,
      explain = false,
      onclick
      /** Overrides the registry label. Use sparingly — the registry is the source. */
      /** Show the ⓘ affordance next to the button (touch-friendly tooltips). */
    } = $$props;
    const entry = derived(() => doc(docId));
    const text = derived(() => docLabel(docId, label));
    $$renderer2.push(`<span class="wrap svelte-g9c1iq"><button${attr_class(`btn ${stringify(variant)}`, "svelte-g9c1iq")} type="button"${attr("disabled", disabled, true)}${attr("title", entry()?.tooltip)}${attr("aria-label", entry() ? `${text()} — ${entry().tooltip}` : text())}>${escape_html(text())}</button> `);
    if (explain) {
      $$renderer2.push("<!--[0-->");
      Doc($$renderer2, { id: docId });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></span>`);
  });
}
export {
  Button as B
};
