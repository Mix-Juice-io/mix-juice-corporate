import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the site root on Cloudflare Pages (https://mix-juice.io/).
export default defineConfig({
  base: '/',
  plugins: [react()],
})
