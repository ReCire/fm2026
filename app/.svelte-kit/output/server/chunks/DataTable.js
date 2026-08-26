import { e as escape_html, a as ensure_array_like, c as attr, b as attr_class } from "./index.js";
import "./DataTable.svelte_svelte_type_style_lang.js";
function DataTable($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { columns, rows, row, empty = "Keine Einträge." } = $$props;
    if (rows.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="empty svelte-1rpfqoq">${escape_html(empty)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="scroll svelte-1rpfqoq"><table class="svelte-1rpfqoq"><thead><tr><!--[-->`);
      const each_array = ensure_array_like(columns);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let c = each_array[$$index];
        $$renderer2.push(`<th${attr("data-hide-below", c.hideBelow)}${attr_class("svelte-1rpfqoq", void 0, { "num": c.numeric })}>${escape_html(c.header)}</th>`);
      }
      $$renderer2.push(`<!--]--></tr></thead><tbody><!--[-->`);
      const each_array_1 = ensure_array_like(rows);
      for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
        let r = each_array_1[i];
        row($$renderer2, r);
        $$renderer2.push(`<!---->`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  DataTable as D
};
