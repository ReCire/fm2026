import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // The game is entirely client-side: no server, no database, no runtime.
    // adapter-static emits a folder of files that any host will serve.
    adapter: adapter({ fallback: 'index.html', strict: false }),
    alias: { $features: 'src/lib/features', $content: 'content' }
  }
};
