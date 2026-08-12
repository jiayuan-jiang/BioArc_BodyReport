import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.jsx via virtual:pwa-register instead —
      // the auto-injected registerSW.js script never reloads the page when a
      // new service worker takes over, so updates could sit installed but
      // invisible indefinitely. injectRegister: false skips generating/
      // injecting that script to avoid double-registering.
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'BioARC — Specimen Collection',
        short_name: 'BioARC',
        description: 'Field specimen collection survey with offline support.',
        theme_color: '#3D7A5E',
        background_color: '#F4F7F5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML/fonts/icons) is precached so the form loads
        // with zero network. Live data APIs (species, weather, Kobo submit)
        // are deliberately NOT cached here — offline handling for those goes
        // through the app-level queue in src/offline/, not stale SW cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Default cap is 2 MiB; the lazy-loaded HEIC decoder chunk (heic-to, WASM
        // libheif) alone is ~3MB unminified. It's fetched at runtime only when a
        // HEIC photo is actually picked, but still needs precaching like the rest
        // of the app shell so that first HEIC upload also works with zero network
        // in the field, not just JPG/PNG.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-marker-assets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
