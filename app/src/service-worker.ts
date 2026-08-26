/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

/**
 * SvelteKit hands us the exact list of built assets, hashed per deploy — so
 * unlike a hand-written precache list, this can never drift out of date.
 *
 * The game is a client-side simulation with local saves: once cached, it plays
 * with no connection at all.
 */
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `anstoss-${version}`;
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => sw.skipWaiting())
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      // Hashed build assets never change under the same URL: cache wins.
      if (PRECACHE.includes(url.pathname)) {
        const hit = await cache.match(url.pathname);
        if (hit) return hit;
      }

      // Everything else: try the network, fall back to whatever we have.
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const hit = await cache.match(request);
        if (hit) return hit;
        throw new Error('offline and not cached');
      }
    })()
  );
});
