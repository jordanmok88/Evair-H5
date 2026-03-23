import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiResponseCapture } from './vite-plugins/apiResponseCapture';

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
        },
      },
      plugins: [
        react(),
        tailwindcss(),
        apiResponseCapture(), // API 响应捕获插件
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
