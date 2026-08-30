import { browser } from '$app/environment';

/**
 * Theme preference.
 *
 * Deliberately NOT part of the save.
 *
 * A career is portable — exported, imported, opened on another device. A theme
 * is not: it belongs to this person on this screen, and carrying it inside a
 * save file means importing a career on a phone drags along the theme chosen on
 * a laptop, in a room with different light. Same category error as putting
 * window size in a document.
 *
 * So: localStorage, keyed per device, defaulting to the system setting rather
 * than to a hardcoded dark. `system` is a real value, not the absence of one —
 * a player who never chose should follow their OS when it changes at dusk.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'anstoss:theme';

function read(): ThemeChoice {
  if (!browser) return 'system';
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch {
    // Private browsing, blocked site data, an embedded webview — all throw
    // rather than returning null. Falling back to the system setting is
    // correct behaviour, not an error worth surfacing.
    return 'system';
  }
}

export const theme = $state<{ choice: ThemeChoice }>({ choice: read() });

/** What the page is actually showing, once `system` is resolved. */
export function resolved(): 'light' | 'dark' {
  if (theme.choice !== 'system') return theme.choice;
  if (!browser) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Apply the choice to the document and remember it.
 *
 * `system` REMOVES the attribute rather than stamping a resolved value, so the
 * CSS media query stays live and the page follows the OS as it changes. Writing
 * the resolved value would freeze it at whatever it was when the page loaded.
 */
export function setTheme(choice: ThemeChoice): void {
  theme.choice = choice;
  if (!browser) return;

  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);

  paintBrowserChrome();

  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // The preference just will not persist. The page is already correct.
  }
}

/** Call once on boot, before first paint where possible. */
export function initTheme(): void {
  setTheme(read());
}

export const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'System',
  light: 'Hell',
  dark: 'Dunkel'
};

/** The header colour of each theme, matching `--bg-sidebar` in tokens.css. */
const CHROME = { dark: '#141F1A', light: '#FFFDF7' } as const;

/**
 * Tell the phone what colour the page is.
 *
 * `app.html` carries a `theme-color` per `prefers-color-scheme`, which covers
 * the `system` choice. It cannot cover an EXPLICIT choice, because a media
 * query has no way to see a preference stored in localStorage — so a player on
 * a dark phone who picks the light theme would get a black bar above a cream
 * page. This writes the resolved answer over the top.
 *
 * Only the un-media-queried tag is touched, so the system pair underneath stays
 * intact and keeps working if the choice goes back to `system`.
 */
function paintBrowserChrome(): void {
  if (!browser) return;
  const wanted = CHROME[resolved()];
  let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'theme-color';
    document.head.appendChild(tag);
  }
  tag.content = wanted;
}
