import { defineCollection, defineContentConfig, defineAgentSection, reference } from '@lupinum/ginko-content/config'
import { z } from 'zod'
export const docs = defineCollection({ type: 'page', source: '1.docs/**/*.md', route: '/docs', i18n: true,
  schema: z.object({ title: z.string(), description: z.string(), author: reference('docs').optional() }),
  agent: { section: 'docs', markdown: true } })
export const guides = defineCollection({ type: 'page', source: '2.*/**/*.md', route: { en: '/guides', de: '/leitfaden', ja: '/gaido' }, i18n: true,
  schema: z.object({ title: z.string(), description: z.string() }),
  agent: { section: 'guides', markdown: true } })
export default defineContentConfig({ collections: { docs, guides }, agent: {
  site: { title: { en: 'Ginko multilingual', de: 'Ginko mehrsprachig', ja: 'Ginko 多言語' },
    description: { en: 'Three languages, one content model.', de: 'Drei Sprachen, ein Inhaltsmodell.', ja: '三つの言語、一つのモデル。' },
    whenToUse: { en: 'Test localized content.', de: 'Mehrsprachige Inhalte testen.', ja: '多言語コンテンツを検証する。' },
    contentSignals: { search: true, aiInput: true, aiTrain: false } },
  markdown: { metadata: { enabled: true, defaultFields: ['title', 'description', 'url', 'locale', 'collection'] } },
  sections: [defineAgentSection({ id: 'docs', title: { en: 'Documentation', de: 'Dokumentation', ja: 'ドキュメント' }, order: 10 }), defineAgentSection({ id: 'guides', title: { en: 'Guides', de: 'Leitfäden', ja: 'ガイド' }, order: 20 })]
} })
