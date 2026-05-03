import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiResponseCapture } from './vite-plugins/apiResponseCapture';
import { sitemapPlugin } from './vite-plugins/sitemap';

// Dev-only: rewrite the <title> so the tab reads "Evair H5" instead of the
// long SEO title we serve in production. Keeps prod HTML / OG tags untouched.
const devTitlePlugin = {
  name: 'dev-title-override',
  apply: 'serve' as const,
  transformIndexHtml(html: string) {
    return html.replace(/<title>[\s\S]*?<\/title>/, '<title>Evair H5</title>');
  },
};

/** Default: local `netlify dev` (:functions). Override with VITE_NETLIFY_FUNCTIONS_PROXY_TARGET — never point at prod by default. */
const DEFAULT_NETLIFY_FUNCTIONS_PROXY = 'http://127.0.0.1:8888';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const netlifyFnTarget =
    env.VITE_NETLIFY_FUNCTIONS_PROXY_TARGET || DEFAULT_NETLIFY_FUNCTIONS_PROXY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        /**
         * Same-origin escape hatch for `npm run dev` when the browser Origin is NOT
         * allowed by Laravel CORS (e.g. iPhone hitting `http://192.168.x.x:3000`).
         * The API client defaults to this base only in DEV when `VITE_API_BASE_URL` is unset
         * (see `services/api/client.ts`). Requests go Host: localhost:3000 → Vite → China API.
         */
        '/evair-api-proxy': {
          target: 'https://evair.zhhwxt.cn',
          changeOrigin: true,
          rewrite: (path: string) => `/api/v1${path.replace(/^\/evair-api-proxy/, '') || ''}`,
        },
        '/api/track': {
          target: netlifyFnTarget,
          changeOrigin: true,
        },
        '/api/esim': {
          target: netlifyFnTarget,
          changeOrigin: true,
        },
        '/api/stripe-checkout': {
          target: netlifyFnTarget,
          changeOrigin: true,
        },
        '/api/stripe-verify': {
          target: netlifyFnTarget,
          changeOrigin: true,
        },
        // Local Laravel dev proxy. Forwards `/laravel-api/*` -> `/api/*` on
        // whichever host `VITE_LARAVEL_PROXY_TARGET` points at (defaults to
        // `php artisan serve --host=127.0.0.1 --port=8100`).
        '/laravel-api': {
          target: env.VITE_LARAVEL_PROXY_TARGET || 'http://127.0.0.1:8100',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/laravel-api/, '/api'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      apiResponseCapture(), // API 响应捕获插件
      devTitlePlugin, // Dev-only: tab title -> "Evair H5"
      // Build-time sitemap.xml — single source of truth pulls from
      // data/{travelEsimCountries,helpArticles,blogPosts}.ts so adding
      // a country page or article auto-lands in the next sitemap.
      sitemapPlugin({ baseUrl: 'https://evairdigital.com' }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
