import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project repo from /<repo>/, a plain static host from /.
// Set BASE_URL at build time for the former: BASE_URL=/rusvpn/ npm run build
export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    // the page is one screen-by-screen scroll, so a single chunk beats a
    // waterfall of small ones — there is nothing here to load on demand
    chunkSizeWarningLimit: 700,
  },
})
