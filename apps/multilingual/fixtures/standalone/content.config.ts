import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
export const docs = defineCollection({ type: 'page', source: 'docs/**/*.md', route: '/docs', i18n: true })
export const plain = defineCollection({ type: 'page', source: 'plain.md', route: '/plain', i18n: false })
export const local = defineCollection({ type: 'page', source: 'local/**/*.md', route: '/local', i18n: { locales: ['en', 'ja'], defaultLocale: 'en' } })
export default defineContentConfig({ collections: { docs, plain, local } })
