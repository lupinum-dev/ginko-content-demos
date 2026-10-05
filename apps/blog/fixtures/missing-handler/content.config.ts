import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
export const records = defineCollection({ type: 'page', source: '*.md', route: '/unhandled' })
export default defineContentConfig({ collections: { records } })
