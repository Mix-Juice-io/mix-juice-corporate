import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// Articles are authored as Markdown files in src/content/articles/.
// Frontmatter is validated at build time so missing required fields fail fast.
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Mix-Juice'),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { articles }
