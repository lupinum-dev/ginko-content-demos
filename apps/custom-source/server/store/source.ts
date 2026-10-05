import { createHash } from 'node:crypto'
import { createContentDataSourceCacheHint, createContentDataSourceError, CONTENT_DATA_SOURCE_LIMITS, type ContentDataSource, type ContentDataSourceControl, type BoundedContentProviderQuery } from '@lupinum/ginko-content/data-source'
import { normalizeProviderDocument } from '@lupinum/ginko-content/provider'
import published from './published.json'
import site from './site.json'

export interface VerifiedContext { audience: 'public' }
const documents = published.map(normalizeProviderDocument)
const snapshot = createHash('sha256').update(JSON.stringify([published, site])).digest('hex')
const route = (d: typeof documents[number]) => ({ collection: d.collection, canonicalKey: d.canonicalKey, locale: d.locale, contentPath: d.contentPath })
const cache = createContentDataSourceCacheHint({ tags: ['catalog'], maxAge: 60, swr: 300, etag: snapshot, lastModified: 1791158400000 })
const result = <T>(data: T) => ({ data, cache })
function guard(context: VerifiedContext, control: ContentDataSourceControl) {
  if (context.audience !== 'public') throw createContentDataSourceError('BACKEND_FAILURE')
  control.signal.throwIfAborted()
  if (Date.now() >= control.deadlineAt) throw createContentDataSourceError('BACKEND_FAILURE')
}
type Filter = BoundedContentProviderQuery['plan']['filter']
function matches(d: typeof documents[number], filter: Filter): boolean {
  switch (filter.type) {
    case 'true': return true
    case 'and': return filter.clauses.every(clause => matches(d, clause))
    case 'or': return filter.clauses.some(clause => matches(d, clause))
    case 'not': return !matches(d, filter.clause)
    case 'compare':
      if (filter.operator === 'eq') return d[filter.field] === filter.value
      throw createContentDataSourceError('QUERY_UNSUPPORTED')
  }
}
function select(query: BoundedContentProviderQuery) {
  const plan = query.plan
  let rows = documents.filter(d => !d.draft && (!query.collection || d.collection === query.collection) && matches(d, plan.filter))
  const variant = plan.variant
  if (variant?.by === 'path') rows = rows.filter(d => d.contentPath === variant.path && (!variant.locale || d.locale === variant.locale))
  if (variant?.by === 'route') {
    const found = variant.candidates.map(c => rows.find(d => c.contentPath === d.contentPath && c.locale === d.locale)).find(Boolean)
    rows = found ? [found] : []
  }
  if (variant?.by === 'ref') {
    const found = variant.localeChain.map(locale => rows.find(d => d.locale === locale && (d.canonicalKey === variant.requestedRef || d.contentPath === variant.requestedRef))).find(Boolean)
    rows = found ? [found] : []
  }
  if (plan.resolveLocale?.locale) rows = rows.filter(d => d.locale === plan.resolveLocale?.locale)
  return rows.sort((a, b) => {
    for (const term of plan.sort) {
      const x = a[term.field], y = b[term.field]
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), term.locale, { numeric: term.numeric, sensitivity: term.sensitivity, caseFirst: term.caseFirst })
      if (cmp) return cmp * term.direction
    }
    return a.canonicalKey.localeCompare(b.canonicalKey)
  })
}
// Cursor scope contains the immutable snapshot and exact query plan. A new store
// version invalidates existing continuations; cursors never include credentials.
function cursorScope(query: BoundedContentProviderQuery) {
  const { pagination, ...plan } = query.plan
  return JSON.stringify([snapshot, query.collection, plan])
}
function decodeCursor(cursor: string, scope: string, ceiling: number) {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString())
    if (!Array.isArray(value) || value.length !== 2 || value[0] !== scope || !Number.isSafeInteger(value[1]) || value[1] <= 0 || value[1] >= ceiling) throw new Error()
    return Number(value[1])
  } catch { throw createContentDataSourceError('QUERY_CURSOR_INVALID') }
}
const encodeCursor = (scope: string, offset: number) => Buffer.from(JSON.stringify([scope, offset])).toString('base64url')
export const source = {
  name: 'catalog',
  capabilities: { protocol: 'ginko-content-data-source/v1', query: { operators: ['$eq'], pagination: ['offset', 'cursor'], maxPageSize: CONTENT_DATA_SOURCE_LIMITS.maxQueryPageSize } },
  async query(context, query, control) {
    guard(context, control)
    const rows = select(query)
    const p = query.plan.pagination
    if (query.plan.mode === 'count') return result({ result: rows.length })
    if (query.plan.mode === 'first') return result({ result: rows[p.mode === 'cursor' ? 0 : p.skip] })
    const limit = p.limit ?? 100
    const scope = cursorScope(query)
    const skip = p.mode === 'cursor' ? p.after ? decodeCursor(p.after, scope, rows.length) : 0 : p.skip
    const selected = rows.slice(skip, skip + limit).map(d => {
      // Identity/body remain mandatory raw-document facts even with projection.
      const identity = { ...route(d), body: d.body, type: d.type, routeVariants: d.routeVariants }
      if (query.plan.projection.only.length) return { ...identity, ...Object.fromEntries(query.plan.projection.only.filter(k => k in d).map(k => [k, d[k]])) }
      return { ...Object.fromEntries(Object.entries(d).filter(([k]) => !query.plan.projection.without.includes(k))), ...identity }
    })
    if (p.mode === 'cursor') {
      const hasNext = skip + limit < rows.length
      return result({ mode: 'cursor', result: selected, limit, pageInfo: { endCursor: hasNext ? encodeCursor(scope, skip + limit) : null, hasNext } })
    }
    return result({ ...(p.mode === 'offset' ? { mode: 'offset' } : {}), result: selected, skip, limit, total: rows.length })
  },
  async navigation(context, query, options, control) {
    guard(context, control)
    return result(select(query).slice(0, options.limit).map(d => ({ title: String(d.title), route: route(d) })))
  },
  async surroundings(context, collection, path, options, control) {
    guard(context, control)
    const rows = documents.filter(d => !d.draft && d.collection === collection && (!options.locale || d.locale === options.locale))
    const i = rows.findIndex(d => d.contentPath === path)
    const item = (d: typeof rows[number] | undefined) => d ? { title: String(d.title), route: route(d) } : null
    return result(i < 0 ? [null, null] : [item(rows[i - 1]), item(rows[i + 1])])
  },
  async search(context, request, control) {
    guard(context, control)
    return result(documents.filter(d => !d.draft && (!request.locale || d.locale === request.locale) && (!request.collections || request.collections.includes(d.collection)) && String(d.searchText).toLowerCase().includes(request.term.toLowerCase())).slice(0, request.limit).map(d => ({ title: String(d.title), excerpt: String(d.description), score: 1, route: route(d) })))
  },
  async siteData(context, request, control) {
    guard(context, control)
    return result({ key: request.key, locale: request.locale ?? null, data: request.key === 'site' ? site : null, updatedAt: 1791158400000 })
  },
  async routes(context, request, control) {
    guard(context, control)
    const rows = documents.filter(d => !d.draft)
    const offset = request.cursor ? decodeCursor(request.cursor, snapshot, rows.length) : 0
    // Two records per page exercise enumeration continuation even for this tiny store.
    const limit = Math.min(request.limit, 2)
    return result({ items: rows.slice(offset, offset + limit).map(route), snapshot, nextCursor: offset + limit < rows.length ? encodeCursor(snapshot, offset + limit) : null })
  }
} satisfies ContentDataSource<VerifiedContext>
