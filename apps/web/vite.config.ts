import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ironlogs/',
  server: {
    host: '0.0.0.0',
    watch: {
      // Also watch public/ so CSV edits trigger a full reload
      ignored: ['!**/public/**'],
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/male-musculature.png'],
      manifest: {
        name: 'IronLogs — Strength Tracker',
        short_name: 'IronLogs',
        description: 'Track your lifts, score your strength, own your data.',
        theme_color: '#1b1b1d',
        background_color: '#1b1b1d',
        display: 'standalone',
        start_url: '/ironlogs/',
        icons: [
          { src: '/ironlogs/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/ironlogs/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,csv}'],
      },
    }),
  ],
})
