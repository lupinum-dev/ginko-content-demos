import { navigation, type NavigationOptions } from '@lupinum/ginko-content/server'
import { z } from 'zod'
import contentConfig from '~~/content.config'
// The public helper validates options at the query boundary, including malformed test inputs.
export default defineEventHandler(async event => {
  const collection: string = z.enum(Object.keys(contentConfig.collections)).parse(getQuery(event).collection ?? 'posts')
  const options = await readBody<NavigationOptions>(event)
  return navigation(event, collection, options)
})
