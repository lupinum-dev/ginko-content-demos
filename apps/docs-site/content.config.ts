import { defineAgentSection, defineAgentAppPage, defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
import { z } from 'zod'
export const docs = defineCollection({
  type: 'page', source: 'docs/**/*.md', route: '/docs',
  agent: { section: 'docs', markdown: true },
  schema: z.object({ title: z.string(), description: z.string(), icon: z.string().optional(), order: z.number(), category: z.string(), sidebar: z.string().optional(), badge: z.string().optional() })
})
export const internal = defineCollection({ type: 'page', source: 'internal/**/*.md', route: '/internal', sitemap: false })
export const settings = defineCollection({ type: 'data', source: 'settings/*.json' })
export default defineContentConfig({
  agent: {
    site: {
      title: 'Fieldnote documentation', description: 'Documentation for a small field notebook.',
      whenToUse: 'Use this site to install Fieldnote and record or share observations.',
      whenNotToUse: 'Do not use this site for account or billing support.',
      contentSignals: { search: true, aiInput: true, aiTrain: false }
    },
    sections: [defineAgentSection({ id: 'docs', title: 'Documentation', order: 10 })],
    pages: [defineAgentAppPage({ id: 'support', route: '/support', section: 'docs', title: 'Support', description: 'Fieldnote support.', includeInFull: false, metadata: ['title', 'route'], render: () => '# Support\n\nAsk your team notebook owner for help.' }), defineAgentAppPage({ id: 'examples', route: '/inspect', section: 'docs', title: 'Examples', description: 'Component and content examples.', includeInIndex: false, render: () => '# Examples\n\nEXAMPLES_FULL_ONLY_SENTINEL' })]
  },
  collections: { docs, internal, settings }
})
