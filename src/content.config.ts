import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'zod'

const work = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string(),
            category: z.enum(['Engineering', 'Leadership', 'Design']),
            tags: z.array(z.string()).min(1),
            /**
             * A single 4-digit year ("2022") or an en-dash year range
             * ("2022–2024") — every existing case study uses the range form,
             * since each spans multiple years of work.
             */
            year: z
                .string()
                .regex(
                    /^\d{4}(–\d{4})?$/,
                    'year must be a 4-digit year (e.g. "2022") or an en-dash year range (e.g. "2022–2024")',
                ),
            /** First case study gets the featured (wide) card treatment */
            featured: z.boolean().default(false),
            /** Controls display order — kept because filenames become URLs */
            order: z.number().int().nonnegative(),
            draft: z.boolean().default(false),
            /** Optional teaser screenshot shown on the homepage card */
            coverImage: image().optional(),
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
        // Required with at least one tag — a bare `.default([])` would let a
        // post silently skip tagging entirely (Zod's default() short-circuits
        // .min(1) when the field is omitted, only enforcing it when an empty
        // array is passed explicitly), which defeats the point of the
        // constraint.
        tags: z.array(z.string()).min(1),
    }),
})

export const collections = { work, principles, blog }
