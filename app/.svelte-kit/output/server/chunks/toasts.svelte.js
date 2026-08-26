import "clsx";
let nextId = 1;
const toasts = { items: [] };
function toast(title, detail, severity = "info") {
  const id = nextId++;
  toasts.items.push({ id, title, detail, severity });
  const ttl = severity === "bad" ? 7e3 : 4e3;
  setTimeout(() => dismiss(id), ttl);
}
function fromEvent(e) {
  toast(e.title, e.detail, e.severity);
}
function dismiss(id) {
  const i = toasts.items.findIndex((t) => t.id === id);
  if (i >= 0) toasts.items.splice(i, 1);
}
export {
  toast as a,
  fromEvent as f,
  toasts as t
};
