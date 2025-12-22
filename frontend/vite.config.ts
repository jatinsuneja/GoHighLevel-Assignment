import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: import.meta.VITE_SERVER_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Proxying:', req.method, req.url);
          });
        },
      },
      '/socket.io': {
        target: import.meta.VITE_SERVER_BASE_URL,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
