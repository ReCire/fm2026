import { b as attr_class, e as escape_html, s as stringify } from "./index.js";
import { D as Doc } from "./Doc.js";
import "./DataTable.svelte_svelte_type_style_lang.js";
function StatChip($$renderer, $$props) {
  let { label, value, tone = "neutral", doc: docId } = $$props;
  $$renderer.push(`<div${attr_class(`chip ${stringify(tone)}`, "svelte-19e3fh6")}><span class="label svelte-19e3fh6">${escape_html(label)} `);
  if (docId) {
    $$renderer.push("<!--[0-->");
    Doc($$renderer, { id: docId });
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></span> <strong class="tabular svelte-19e3fh6">${escape_html(value)}</strong></div>`);
}
export {
  StatChip as S
};
