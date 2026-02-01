import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa" 

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  plugins: [
    react(), 
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt"],
      devOptions: {
        enabled: true,           // ✅ serve manifest/service worker in dev
      },
      manifest: {
        name: "NextMake Shot Tracker",
        short_name: "NextMake",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })],
  server: {
    port: 5173,        // ✅ choose the port you want (keep consistent with Supabase redirect)
    strictPort: true,  // ✅ ensures it fails if 5173 is in use instead of auto-switching
    host: "localhost", // optional: binds to localhost only
  },
})
