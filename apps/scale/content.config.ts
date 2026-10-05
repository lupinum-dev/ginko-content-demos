import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
import { z } from 'zod'
export const docs = defineCollection({
  type: 'page', source: 'docs/**/*.md', route: '/docs', i18n: true,
  agent: { markdown: true },
  schema: z.object({ title: z.string(), description: z.string(), rank: z.number() })
})
export default defineContentConfig({ collections: { docs }, agent: {
  site: { title: 'Ginko Content scale', description: '2,000 generated Markdown documents.', whenToUse: 'Measure filesystem content, search completeness, and request cost.' }
} })
