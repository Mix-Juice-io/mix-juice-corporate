// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

// Production site origin. Used for canonical URLs, OGP, and sitemap generation.
export default defineConfig({
  site: 'https://mix-juice.io',
  trailingSlash: 'ignore',
  integrations: [react(), sitemap()],
})
