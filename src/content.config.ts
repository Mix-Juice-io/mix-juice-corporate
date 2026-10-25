import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

// Articles are authored as Markdown files in src/content/articles/.
// Frontmatter is validated at build time so missing required fields fail fast.
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    // Set only for substantive updates (body, structured data, links). It
    // becomes the sitemap <lastmod> (src/lib/article-lastmod.mjs).
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Mix-Juice'),
    category: z.enum(['食品表示', 'Shopify']).optional(),
    tags: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { articles }
