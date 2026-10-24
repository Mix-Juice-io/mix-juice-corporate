// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import rehypeWrapTables from './src/lib/rehype-wrap-tables.mjs'

// Production site origin. Used for canonical URLs, OGP, and sitemap generation.
export default defineConfig({
  site: 'https://mix-juice.io',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  markdown: {
    rehypePlugins: [rehypeWrapTables],
  },
})
