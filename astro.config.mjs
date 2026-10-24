// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import rehypeWrapTables from './src/lib/rehype-wrap-tables.mjs'

// Production site origin. Used for canonical URLs, OGP, and sitemap generation.
export default defineConfig({
  site: 'https://mix-juice.io',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  // Astro 7 defaults to 'jsx', which strips whitespace between inline
  // elements; keep the Astro 6 behavior so rendered text does not change.
  compressHTML: true,
  // Astro 7 renders Markdown with Sätteri by default; keep the remark/rehype
  // pipeline for rehype-wrap-tables.
  markdown: {
    processor: unified({ rehypePlugins: [rehypeWrapTables] }),
  },
  vite: {
    build: {
      // Explicit Vite "baseline widely available" targets. Without them the
      // CSS minifier (lightningcss) drops -webkit-backdrop-filter, which
      // Safari before 18 needs for the blurred header and panels.
      cssTarget: [
        'chrome111',
        'edge111',
        'firefox114',
        'safari16.4',
        'ios16.4',
      ],
    },
  },
})
