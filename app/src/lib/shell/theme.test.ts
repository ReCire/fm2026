import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The theme preference is device-scoped, not part of the save.
 *
 * These pin the two decisions that are easy to get wrong later: `system` must
 * REMOVE the attribute rather than stamp a resolved value (otherwise the page
 * freezes at whatever the OS said on load and stops following it at dusk), and
 * every storage access must survive throwing (private browsing and embedded
 * webviews throw rather than returning null).
 */
const store = new Map<string, string>();
const attrs = new Map<string, string>();

vi.mock('$app/environment', () => ({ browser: true }));

beforeEach(() => {
  store.clear();
  attrs.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  });
  /*
   * The stub grew a head and a querySelector when the theme started painting
   * the browser chrome. Widened rather than guarded in the source: a
   * `document` without a `head` is not a real environment, and adding a
   * `typeof … === 'function'` check to production code to satisfy a test
   * double would be the test dictating the shape of the thing it tests.
   */
  const metas: { name?: string; media?: string; content?: string }[] = [];
  vi.stubGlobal('document', {
    documentElement: {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k)
    },
    head: { appendChild: (m: { name?: string }) => void metas.push(m) },
    createElement: () => ({}) as { name?: string; content?: string },
    querySelector: (sel: string) =>
      sel.includes('theme-color') ? metas.find((m) => m.name === 'theme-color' && !m.media) ?? null : null
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false })
  });
  vi.resetModules();
});

describe('theme preference', () => {
  it('defaults to system, not to a hardcoded dark', async () => {
    const { theme } = await import('./theme.svelte');
    expect(theme.choice).toBe('system');
  });

  it('stamps an explicit choice and remembers it', async () => {
    const { setTheme } = await import('./theme.svelte');
    setTheme('light');
    expect(attrs.get('data-theme')).toBe('light');
    expect(store.get('anstoss:theme')).toBe('light');
  });

  it('system REMOVES the attribute, so the media query stays live', async () => {
    const { setTheme } = await import('./theme.svelte');
    setTheme('dark');
    expect(attrs.has('data-theme')).toBe(true);
    setTheme('system');
    expect(attrs.has('data-theme')).toBe(false);
    expect(store.has('anstoss:theme')).toBe(false);
  });

  it('resolves system against the OS rather than freezing a value', async () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const { setTheme, resolved } = await import('./theme.svelte');
    setTheme('system');
    expect(resolved()).toBe('light');
  });

  it('survives storage that throws, and still applies the theme', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    });
    const { setTheme, theme } = await import('./theme.svelte');
    expect(theme.choice).toBe('system');
    expect(() => setTheme('dark')).not.toThrow();
    expect(attrs.get('data-theme')).toBe('dark');
  });

  it('ignores a corrupted stored value', async () => {
    store.set('anstoss:theme', 'chartreuse');
    const { theme } = await import('./theme.svelte');
    expect(theme.choice).toBe('system');
  });
});
