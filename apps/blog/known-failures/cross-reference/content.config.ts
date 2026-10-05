import { defineCollection, defineContentConfig, reference } from '@lupinum/ginko-content/config'
import { z } from 'zod'
const records = defineCollection({ type: 'data', source: '*.json', schema: z.object({ favorite: reference() }) })
export default defineContentConfig({ collections: { records } })
