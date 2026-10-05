import { many, type ManyOptions } from '@lupinum/ginko-content/server'
import { z } from 'zod'
import contentConfig from '~~/content.config'
// The public helper validates options at the query boundary, including malformed test inputs.
export default defineEventHandler(async event => {
  const collection: string = z.enum(Object.keys(contentConfig.collections)).parse(getQuery(event).collection ?? 'posts')
  const options = await readBody<ManyOptions>(event)
  return many(event, collection, options)
})
