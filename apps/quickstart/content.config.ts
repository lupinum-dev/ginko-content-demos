import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
import { z } from 'zod'

export const pages = defineCollection({
  type: 'page',
  source: '**/*.md',
  schema: z.object({
    title: z.string(),
    description: z.string().optional()
  })
})

export default defineContentConfig({
  collections: { pages }
})
