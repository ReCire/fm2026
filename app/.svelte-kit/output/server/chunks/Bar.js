import { c as attr, aa as attr_style, s as stringify, d as derived } from "./index.js";
import "./DataTable.svelte_svelte_type_style_lang.js";
function Bar($$renderer, $$props) {
  let {
    value,
    max = 100,
    tone = "auto",
    label
    /** 'auto' colours by how full the bar is — right for fitness and morale. */
  } = $$props;
  const pct = derived(() => Math.max(0, Math.min(100, value / max * 100)));
  const colour = derived(() => tone !== "auto" ? `var(--${tone})` : pct() >= 66 ? "var(--primary)" : pct() >= 33 ? "var(--accent)" : "var(--danger)");
  $$renderer.push(`<div class="bar svelte-1e4dm7n" role="meter"${attr("aria-valuenow", value)} aria-valuemin="0"${attr("aria-valuemax", max)}${attr("aria-label", label)}><span${attr_style(`width: ${stringify(pct())}%; background: ${colour()}`)} class="svelte-1e4dm7n"></span></div>`);
}
export {
  Bar as B
};
