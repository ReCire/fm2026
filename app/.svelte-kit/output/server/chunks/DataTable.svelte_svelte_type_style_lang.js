import { aa as attr_style, e as escape_html, s as stringify } from "./index.js";
function Panel($$renderer, $$props) {
  let { title, accent = "accent", meta, children, actions } = $$props;
  $$renderer.push(`<section class="panel svelte-d13yz0">`);
  if (title) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<header${attr_style(`--panel-accent: var(--${stringify(accent)})`)} class="svelte-d13yz0"><h2 class="svelte-d13yz0">${escape_html(title)}</h2> <div class="right svelte-d13yz0">`);
    if (meta) {
      $$renderer.push("<!--[0-->");
      $$renderer.push(`<span class="meta svelte-d13yz0">${escape_html(meta)}</span>`);
    } else {
      $$renderer.push("<!--[-1-->");
    }
    $$renderer.push(`<!--]--> `);
    if (actions) {
      $$renderer.push("<!--[0-->");
      actions($$renderer);
      $$renderer.push(`<!---->`);
    } else {
      $$renderer.push("<!--[-1-->");
    }
    $$renderer.push(`<!--]--></div></header>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> `);
  children($$renderer);
  $$renderer.push(`<!----></section>`);
}
export {
  Panel as P
};
