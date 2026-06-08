import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Manual chunks so big libraries don't get bundled into whatever page
    // first imports them. Before this, recharts (used only in PriceChart)
    // was inlined into the Dashboard chunk → Dashboard.js = 473KB.
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy charting lib — only PriceChart needs it
          recharts: ['recharts'],
          // Socket.IO runtime — shared across Chat + Dashboard + Notifications
          'socket-io': ['socket.io-client'],
          // Router + helmet — used on every page, fine to share
          'router': ['react-router-dom', 'react-helmet-async'],
          // Icon library — every page imports a handful, keep them together
          'icons': ['lucide-react'],
        },
      },
    },
    // Warn (don't fail) on chunks over 600KB. 500KB is too aggressive given
    // recharts alone is ~400KB; below that bundles tend to be one-feature.
    chunkSizeWarningLimit: 600,
  },
})
