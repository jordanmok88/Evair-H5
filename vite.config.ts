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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/track': {
            target: 'https://evair-h5.netlify.app',
            changeOrigin: true,
          },
          '/api/esim': {
            target: 'https://evair-h5.netlify.app',
            changeOrigin: true,
          },
          '/api/stripe-checkout': {
            target: 'https://evair-h5.netlify.app',
            changeOrigin: true,
          },
          '/api/stripe-verify': {
            target: 'https://evair-h5.netlify.app',
            changeOrigin: true,
          },
          // Local Laravel dev proxy. Forwards `/laravel-api/*` -> `/api/*` on
          // whichever host `VITE_LARAVEL_PROXY_TARGET` points at (defaults to
          // `php artisan serve --host=127.0.0.1 --port=8100`).
          // Opt in by setting `VITE_BACKSTAGE_BASE_URL=/laravel-api/v1/h5` in
          // `.env.local` when you want the H5 catalogue to hit a local backend.
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
        devTitlePlugin,       // Dev-only: tab title -> "Evair H5"
        // Build-time sitemap.xml — single source of truth pulls from
        // data/{travelEsimCountries,helpArticles,blogPosts}.ts so adding
        // a country page or article auto-lands in the next sitemap.
        sitemapPlugin({ baseUrl: 'https://evairdigital.com' }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
