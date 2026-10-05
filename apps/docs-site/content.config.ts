import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
import { z } from 'zod'
export const docs = defineCollection({
  type: 'page', source: 'docs/**/*.md', route: '/docs',
  schema: z.object({ title: z.string(), description: z.string(), icon: z.string().optional(), order: z.number(), category: z.string(), sidebar: z.string().optional(), badge: z.string().optional() })
})
export const internal = defineCollection({ type: 'page', source: 'internal/**/*.md', route: '/internal', sitemap: false })
export const settings = defineCollection({ type: 'data', source: 'settings/*.json' })
export default defineContentConfig({ collections: { docs, internal, settings } })
