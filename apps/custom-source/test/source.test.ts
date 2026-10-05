import { expect, test, vi } from 'vitest'
import { runContentDataSourceContractSuite, runContentDataSourceContract } from '@lupinum/ginko-content/testing/data-source-contract'
import { runProviderContractSuite } from '@lupinum/ginko-content/testing/provider-contract'
import { bindContentProvider, isContentProviderResult, toContentProviderQuery, toContentProviderNavigationQuery, normalizeProviderDocument } from '@lupinum/ginko-content/provider'
import { createContentDataSourceCacheHint, createContentDataSourceError, type BoundedContentProviderQuery } from '@lupinum/ginko-content/data-source'
import { source } from '../server/store/source'

const context = { audience: 'public' as const }
const createEvent = () => ({ context: {}, node: { req: {}, res: {} } })
const provider = bindContentProvider({ source, createContext: () => context })
function query(overrides: Partial<BoundedContentProviderQuery['plan']> = {}, collection = 'products'): BoundedContentProviderQuery {
  return { v: 5, collection, plan: { mode: 'all', filter: { type: 'true' }, sort: [], projection: { only: [], without: [] }, pagination: { mode: 'offset', skip: 0, limit: 10 }, ...overrides } }
}
const eq = (field: string, value: string | boolean) => ({ type: 'compare' as const, field, operator: 'eq' as const, value })
const first = query({ mode: 'first', pagination: { mode: 'slice', skip: 0, limit: 1 }, filter: eq('title', 'Solar lamp') })
const found = { query: first, assertResult: (r: unknown) => expect(r).toMatchObject({ result: { canonicalKey: 'products:solar-lamp' } }) }
const missing = { query: query({ ...first.plan, filter: eq('title', 'Missing') }), assertResult: (r: unknown) => expect(r).toEqual({ result: undefined }) }
const list = { query: query({ sort: [{ field: 'price', direction: 1 }] }), assertResult: (r: unknown) => expect(r).toMatchObject({ result: [{ title: 'Seed kit' }, { title: 'Solar lamp' }], total: 2, skip: 0, limit: 10 }) }
const count = { query: query({ mode: 'count', pagination: { mode: 'slice', skip: 0 }, filter: eq('title', 'Seed kit') }), assertResult: (r: unknown) => expect(r).toEqual({ result: 1 }) }
const cursor = {
  first: { query: query({ pagination: { mode: 'cursor', limit: 1 }, sort: [{ field: 'price', direction: 1 }] }), assertResult: (r: unknown) => expect(r).toMatchObject({ mode: 'cursor', result: [{ title: 'Seed kit' }], pageInfo: { hasNext: true } }) },
  next: (after: string) => ({ query: query({ pagination: { mode: 'cursor', limit: 1, after }, sort: [{ field: 'price', direction: 1 }] }), assertResult: (r: unknown) => expect(r).toMatchObject({ result: [{ title: 'Solar lamp' }], pageInfo: { hasNext: false, endCursor: null } }) })
}
const operations = {
  navigation: { query: query({ filter: eq('title', 'Care instructions') }, 'docs'), assertResult: (r: unknown) => expect(r).toEqual([{ title: 'Care instructions', route: { collection: 'docs', canonicalKey: 'docs:care', locale: 'en', contentPath: '/docs/care' } }]) },
  surroundings: { collection: 'docs', contentPath: '/docs/start', assertResult: (r: unknown) => expect(r).toEqual([null, { title: 'Care instructions', route: { collection: 'docs', canonicalKey: 'docs:care', locale: 'en', contentPath: '/docs/care' } }]) },
  search: { request: { term: 'pollinators', collections: ['products'], locale: 'en' }, assertResult: (r: unknown) => expect(r).toEqual([{ title: 'Seed kit', excerpt: 'Seed kit from JSON', score: 1, route: { collection: 'products', canonicalKey: 'products:seed-kit', locale: 'en', contentPath: '/products/seed-kit' } }]) },
  siteData: { request: { key: 'site' }, assertResult: (r: unknown) => expect(r).toEqual({ data: { brand: 'Ginko catalog', currency: 'EUR' }, updatedAt: 1791158400000 }) },
  routes: { assertResult: (r: unknown) => expect(r).toEqual([
    { collection: 'docs', canonicalKey: 'docs:start', locale: 'en', contentPath: '/docs/start' },
    { collection: 'docs', canonicalKey: 'docs:care', locale: 'en', contentPath: '/docs/care' },
    { collection: 'products', canonicalKey: 'products:solar-lamp', locale: 'en', contentPath: '/products/solar-lamp' },
    { collection: 'products', canonicalKey: 'products:seed-kit', locale: 'en', contentPath: '/products/seed-kit' }
  ]) }
}
runContentDataSourceContractSuite({ name: 'C236 C237 C238 C241 catalog source', loadSource: async () => source, createContext: () => context, firstFound: found, firstMissing: missing, list, count, cursor, operations })
const probe = (p: typeof found | typeof list | typeof count) => ({ positive: p.query, assertResult: p.assertResult })
const logical = (filter: BoundedContentProviderQuery['plan']['filter'], title: string) => ({ positive: query({ filter }), assertResult: (r: unknown) => expect(r).toMatchObject({ result: [{ title }], total: 1 }) })
runProviderContractSuite({
  name: 'C225 C226 C227 C228 C327 catalog provider', expectedProviderName: 'catalog', loadProvider: async () => provider, createEvent, expectedCapabilities: provider.capabilities,
  operatorProbes: { $eq: probe(found) },
  logicalProbes: { and: logical({ type: 'and', clauses: [eq('title', 'Solar lamp'), eq('locale', 'en')] }, 'Solar lamp'), or: logical({ type: 'or', clauses: [eq('title', 'Seed kit'), eq('title', 'Missing')] }, 'Seed kit'), not: logical({ type: 'not', clause: eq('title', 'Seed kit') }, 'Solar lamp') },
  sortProbe: probe(list), terminalProbes: { first: probe(found), count: probe(count) },
  paginationProbes: { offset: { positive: query({ pagination: { mode: 'offset', skip: 1, limit: 1 }, sort: [{ field: 'price', direction: 1 }] }), assertResult: (r: unknown) => expect(r).toMatchObject({ mode: 'offset', skip: 1, limit: 1, total: 2, result: [{ title: 'Solar lamp' }] }) }, cursor: { positive: cursor.first.query, assertResult: cursor.first.assertResult } }, operationProbes: operations
})
test('C229 C230 C231 raw documents preserve canonical identity and mounted contentPath', () => {
  const d = normalizeProviderDocument({ collection: 'docs', canonicalKey: 'stable-key', locale: 'en', contentPath: '/docs/moved', body: null })
  expect(d).toMatchObject({ canonicalKey: 'stable-key', contentPath: '/docs/moved', routeVariants: [{ locale: 'en', contentPath: '/docs/moved' }] })
  expect(() => normalizeProviderDocument({ ...d, canonicalKey: '' })).toThrow()
})
test('C325 C326 context-free query lowering and named navigation', () => {
  const q = toContentProviderQuery({ collection: 'docs', resolveVariant: { providerPath: '/docs/care' }, first: true })
  expect(q).toMatchObject({ v: 5, collection: 'docs', plan: { variant: { by: 'path', path: '/docs/care' } } })
  expect(toContentProviderNavigationQuery({ collection: 'docs' }).collection).toBe('docs')
})
test('C329 ordered route candidates and reference locales choose the next match', async () => {
  const r = await provider.query(createEvent(), query({ ...first.plan, filter: { type: 'true' }, variant: { by: 'route', requestedRoute: '/docs/care', requestedLocale: 'de', candidates: [{ locale: 'de', contentPath: '/anleitung/pflege' }, { locale: 'en', contentPath: '/docs/care' }] } }, 'docs'))
  expect(isContentProviderResult(r) ? r.data : r).toMatchObject({ result: { canonicalKey: 'docs:care' } })
  const ref = await provider.query(createEvent(), query({ ...first.plan, filter: { type: 'true' }, variant: { by: 'ref', requestedRef: 'docs:care', requestedLocale: 'de', localeChain: ['de', 'en'] } }, 'docs'))
  expect(isContentProviderResult(ref) ? ref.data : ref).toMatchObject({ result: { locale: 'en', contentPath: '/docs/care' } })
})
test('C239 backend receives usable cancellation and deadline controls', async () => {
  let called = false
  const p = bindContentProvider({ source: { ...source, async query(ctx, q, control) { expect(control.signal).toBeInstanceOf(AbortSignal); expect(control.deadlineAt).toBeGreaterThan(Date.now()); called = true; return source.query(ctx, q, control) } }, createContext: () => context })
  await p.query(createEvent(), first)
  expect(called).toBe(true)
})
test('C240 cache hint constructor rejects limits and credential-bearing tags', () => {
  expect(createContentDataSourceCacheHint({ tags: ['catalog'], maxAge: 60 })).toMatchObject({ tags: ['catalog'], maxAge: 60 })
  expect(() => createContentDataSourceCacheHint({ tags: ['https://example.com?token=synthetic'] })).toThrow()
  expect(() => createContentDataSourceCacheHint({ maxAge: 86401 })).toThrow()
})
test('C242 binder rejects repeated route cursors and changing snapshots', async () => {
  for (const bad of ['repeat', 'snapshot']) {
    let n = 0
    const p = bindContentProvider({ source: { ...source, async routes() { n++; return { cache: false, data: { items: [{ collection: 'docs', canonicalKey: 'key'+n, locale: 'en', contentPath: '/docs/'+n }], snapshot: bad === 'snapshot' ? String(n) : 'one', nextCursor: 'repeat' } } } }, createContext: () => context })
    await expect(p.routes!(createEvent())).rejects.toMatchObject({ statusCode: 502 })
  }
})
test('K304 binder rejects a mismatched offset envelope', async () => {
  const p = bindContentProvider({ source: { ...source, async query() { return { cache: false, data: { result: [], skip: 99, limit: 10, total: 0 } } } }, createContext: () => context })
  await expect(p.query(createEvent(), query())).rejects.toMatchObject({ statusCode: 502 })
})
test('C244 invalid cursor maps to HTTP 400', async () => {
  await expect(provider.query(createEvent(), query({ pagination: { mode: 'cursor', limit: 1, after: 'invalid' } }))).rejects.toMatchObject({ statusCode: 400 })
})
test('C233 C330 X301 public authorization excludes drafts on every source surface', async () => {
  const r = await provider.query(createEvent(), query({ ...first.plan, filter: eq('title', 'Unpublished experiment') }, 'docs'))
  expect(isContentProviderResult(r) ? r.data : r).toEqual({ result: undefined })
  const countResult = await provider.query(createEvent(), query({ mode: 'count', filter: eq('draft', true), pagination: { mode: 'slice', skip: 0 } }, 'docs'))
  expect(isContentProviderResult(countResult) ? countResult.data : countResult).toEqual({ result: 0 })
  const search = await provider.search!(createEvent(), { term: 'Unpublished' })
  expect(isContentProviderResult(search) ? search.data : search).toEqual([])
  const nav = await provider.navigation!(createEvent(), query({}, 'docs'))
  expect(JSON.stringify(nav)).not.toContain('Unpublished')
  const routes = await provider.routes!(createEvent())
  expect(JSON.stringify(routes)).not.toContain('/docs/private')
})

test('C328 documented single-query conformance rejects mismatched offset paging', async () => {
  const bad = { ...source, async query() { return { cache: false as const, data: { result: [], skip: 99, limit: 10, total: 0 } } } }
  await expect(runContentDataSourceContract({ source: bad, context, query: query() })).rejects.toThrow('invalid list response')
})

test('C232 C243 optional route sitemap facts reject invalid images and dates', async () => {
  for (const sitemap of [
    { images: Array.from({ length: 17 }, (_, i) => ({ loc: 'https://example.com/'+i+'.png' })) },
    { images: [{ loc: 'https://example.com/'+ 'a'.repeat(2049) }] },
    { lastmod: 'not-a-date' }
  ]) {
    const p = bindContentProvider({ source: { ...source, async routes() { return { cache: false, data: { items: [{ collection: 'docs', canonicalKey: 'docs:test', locale: 'en', contentPath: '/docs/test', sitemap }], snapshot: 'one', nextCursor: null } } } }, createContext: () => context })
    await expect(p.routes!(createEvent())).rejects.toMatchObject({ statusCode: 502 })
  }
})

test('C235 C244 stable typed unsupported backend and cursor HTTP errors', async () => {
  for (const [code,status] of [['QUERY_CURSOR_INVALID',400],['QUERY_UNSUPPORTED',400],['BACKEND_FAILURE',502]] as const) {
    const p = bindContentProvider({ source: { ...source, async query() { throw createContentDataSourceError(code) } }, createContext: () => context })
    await expect(p.query(createEvent(), first)).rejects.toMatchObject({ statusCode:status })
  }
})

test('C244 binder deadline failure maps to HTTP 504', async () => {
  vi.useFakeTimers()
  try {
    const p = bindContentProvider({ source: { ...source, query: () => new Promise(() => {}) }, createContext: () => context })
    const pending = expect(p.query(createEvent(),first)).rejects.toMatchObject({ statusCode:504 })
    await vi.advanceTimersByTimeAsync(10001)
    await pending
  } finally { vi.useRealTimers() }
})
test('C238 binder rejects non-JSON provider fields', async () => {
  const p = bindContentProvider({ source: { ...source, async query() { return { cache:false, data:{ result:{ collection:'products',canonicalKey:'products:invalid',locale:'en',contentPath:'/products/invalid',body:null,score:NaN } } } } }, createContext: () => context })
  await expect(p.query(createEvent(),first)).rejects.toMatchObject({ statusCode:502 })
})

test('C243 route count record-byte and aggregate-byte ceilings reject first invalid enumeration', async () => {
  for (const [count, keyBytes] of [[100001, 0], [1, 65537], [1000, 40000]]) {
    const p = bindContentProvider({ source: { ...source, async routes(_ctx, request) {
      const start = Number(request.cursor ?? 0), end = Math.min(start + request.limit, count)
      return { cache:false, data:{ items:Array.from({ length:end-start }, (_,i) => ({ collection:'docs',canonicalKey:'key'+(start+i)+'x'.repeat(keyBytes),locale:'en',contentPath:'/docs/'+(start+i) })),snapshot:'bounds',nextCursor:end<count ? String(end) : null } }
    } }, createContext:() => context })
    await expect(p.routes!(createEvent())).rejects.toMatchObject({ statusCode:502 })
  }
}, 30000)

test('C241 C244 cursor from a different ordering is rejected as scope-invalid', async () => {
  const response = await provider.query(createEvent(),cursor.first.query)
  const firstPage = isContentProviderResult(response) ? response.data : response
  if (!('mode' in firstPage) || firstPage.mode !== 'cursor') throw new Error('Expected a cursor page')
  const after = firstPage.pageInfo.endCursor
  expect(typeof after).toBe('string')
  await expect(provider.query(createEvent(),query({ pagination:{ mode:'cursor',limit:1,after },sort:[{ field:'price',direction:-1 }] }))).rejects.toMatchObject({ statusCode:400 })
})
