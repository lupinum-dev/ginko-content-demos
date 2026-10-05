import { defineEventHandler } from 'h3'
import { many, navigation, surround, getContentCacheHint, collectContentCacheHint, clearContentCacheHint, contentCacheHeaders } from '@lupinum/ginko-content/server'
import { products, docs } from '../../content.config'
export default defineEventHandler(async event => {
  const catalog = await many(event, products, { sort: { price: 'asc' }, limit: 10 })
  const tree = await navigation(event, docs)
  const neighbors = await surround(event, docs, { by: { route: '/docs/start' } })
  const providerHint = getContentCacheHint(event)
  clearContentCacheHint(event)
  collectContentCacheHint(event, { tags: ['one'], maxAge: 60 })
  collectContentCacheHint(event, { tags: ['two'], maxAge: 30 })
  const merged = getContentCacheHint(event)
  const headers = [...contentCacheHeaders({ maxAge: 60, swr: 300, etag: 'catalog-v1', lastModified: new Date(1791158400000) })]
  clearContentCacheHint(event)
  const cleared = getContentCacheHint(event) ?? null
  let unsupported: unknown
  try { await many(event, products, { where: { price: { $gt: 10 } }, limit: 10 }) }
  catch (error) { unsupported = error instanceof Error ? error.message : String(error) }
  return { catalog, tree, neighbors, providerHint, merged, cleared, headers, unsupported }
})
