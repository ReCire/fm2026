import type { EventSeverity, GameEvent } from '$lib/engine/events';

export interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  severity: EventSeverity;
}

let nextId = 1;

export const toasts = $state<{ items: ToastItem[] }>({ items: [] });

export function toast(title: string, detail?: string, severity: EventSeverity = 'info'): void {
  const id = nextId++;
  toasts.items.push({ id, title, detail, severity });
  // Bad news stays up longer, because it usually needs a decision.
  const ttl = severity === 'bad' ? 7000 : 4000;
  setTimeout(() => dismiss(id), ttl);
}

export function fromEvent(e: GameEvent): void {
  toast(e.title, e.detail, e.severity);
}

export function dismiss(id: number): void {
  const i = toasts.items.findIndex((t) => t.id === id);
  if (i >= 0) toasts.items.splice(i, 1);
}
