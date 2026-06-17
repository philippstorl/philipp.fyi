import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'zod'

const work = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.enum(['Engineering', 'Leadership', 'Design']),
        tags: z.array(z.string()),
        year: z.string(),
        /** First case study gets the featured (wide) card treatment */
        featured: z.boolean().default(false),
        /** Controls display order — kept because filenames become URLs */
        order: z.number(),
        draft: z.boolean().default(false),
    }),
})

const principles = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/principles' }),
    schema: z.object({
        title: z.string(),
        /** One or two sentences shown on the home page card */
        description: z.string(),
        // No order field — display order comes from filename prefix (01-, 02-, …)
    }),
})

const blog = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        draft: z.boolean().default(true),
        tags: z.array(z.string()).default([]),
    }),
})

export const collections = { work, principles, blog }
