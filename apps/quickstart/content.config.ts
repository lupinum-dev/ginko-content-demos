import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
import { z } from 'zod'

export const pages = defineCollection({
  agent: { markdown: true },
  type: 'page',
  source: '**/*.md',
  schema: z.object({
    title: z.string(),
    description: z.string().optional()
  })
})

export default defineContentConfig({
  agent: { site: { title: 'Ginko quickstart', description: 'Two-page runtime agent demo.', whenToUse: 'Use this site to try Ginko Content quickstart and runtime Markdown delivery.', contentSignals: { search: true, aiInput: true, aiTrain: false } } },
  collections: { pages }
})
