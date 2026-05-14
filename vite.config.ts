import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a GitHub Pages project page:
// https://mix-juice-io.github.io/mix-juice-corporate/
export default defineConfig({
  base: '/mix-juice-corporate/',
  plugins: [react()],
})
