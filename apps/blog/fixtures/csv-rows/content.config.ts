import { defineCollection, defineContentConfig } from '@lupinum/ginko-content/config'
export const records = defineCollection({ type: 'data', source: '*.csv' })
export default defineContentConfig({ collections: { records } })
