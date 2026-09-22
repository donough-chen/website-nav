import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './', // GitHub Pages 相对路径
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nav - 网址导航',
        short_name: 'Nav',
        description: '个人网址分类聚合导航',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
        orientation: 'portrait',
        icons: [
          { src: 'icons/72.png',  sizes: '72x72',   type: 'image/png' },
          { src: 'icons/96.png',  sizes: '96x96',   type: 'image/png' },
          { src: 'icons/128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: '新增网址', short_name: '新增', url: './?action=add', icons: [{ src: 'icons/96.png', sizes: '96x96' }] },
          { name: '搜索', short_name: '搜索', url: './?action=search', icons: [{ src: 'icons/96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'favicons',
              expiration: { maxAgeSeconds: 30 * 24 * 3600, maxEntries: 500 }
            }
          }
        ]
      }
    })
  ]
});