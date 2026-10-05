import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'

test('C225 C229 C231 catalog and stored MDC render with public API and correct routes', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Ginko product catalog' })).toBeVisible()
  await expect(page.getByTestId('products').getByRole('link')).toHaveText(['Seed kit', 'Solar lamp'])
  await page.getByRole('link', { name: 'Docs', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Catalog guide' })).toBeVisible()
  await expect(page.getByTestId('stored-mdc')).toContainText('Stored MDC')
  await expect(page.getByTestId('stored-mdc').getByRole('link', { name: 'View the products' })).toHaveAttribute('href', '/products/solar-lamp')
  await expect(page.getByTestId('surround').getByRole('link', { name: 'Care instructions' })).toBeVisible()
  await page.getByTestId('surround').getByRole('link', { name: 'Care instructions' }).click()
  await expect(page.getByRole('heading', { name: 'Care instructions' })).toBeVisible()
  await page.getByRole('link', { name: 'Solar lamp', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Solar lamp' })).toBeVisible()
  expect(errors).toEqual([])
})

test('C180 provider search has the standard collection/path/excerpt shape', async ({ page }) => {
  const responses = []
  page.on('response', r => { if (r.url().includes('/api/_content/search')) responses.push(r) })
  await page.goto('/')
  await page.getByTestId('search-input').fill('pollinators')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByTestId('search-results').getByRole('link', { name: 'Seed kit' })).toBeVisible()
  await expect(page.getByTestId('search-results')).toContainText('Seed kit from JSON')
  const body = await responses.at(-1).json()
  await test.info().attach('provider-search', { body: JSON.stringify(body,null,2), contentType: 'application/json' })
  expect(JSON.stringify(body)).toContain('/products/seed-kit')
  await page.getByTestId('search-results').getByRole('link', { name: 'Seed kit' }).click()
  await expect(page.getByRole('heading', { name: 'Seed kit' })).toBeVisible()
})

test('C233 C330 X301 draft pages remain hidden even with caller-supplied preview headers', async ({ request }) => {
  const r = await request.get('/docs/private', { headers: { 'x-preview': 'true', 'x-tenant-id': 'admin' } })
  expect(r.status()).toBe(404)
  const html = await r.text()
  expect(html).not.toContain('Unpublished experiment')
})

test('C114 C234 C287 C294 C295 C301 runtime queries siteData cache merge clear and headers', async ({ request }) => {
  const r = await request.get('/api/inspect')
  expect(r.status()).toBe(200)
  const data = await r.json()
  await test.info().attach('runtime-inspection', { body: JSON.stringify({ data, headers:r.headers() },null,2), contentType:'application/json' })
  expect(data.catalog.map(d => d.title)).toEqual(['Seed kit','Solar lamp'])
  expect(data.catalog.map(d => d.route.resolvedPath)).toEqual(['/products/seed-kit','/products/solar-lamp'])
  expect(data.tree.map(d=>d.title)).toEqual(['Care instructions','Catalog guide'])
  expect(data.neighbors.previous).toBeNull()
  expect(data.neighbors.next.path).toBe('/docs/care')
  expect(data.providerHint.tags).toContain('catalog')
  expect(data.merged.tags).toEqual(['one','two'])
  expect(data.merged.maxAge).toBe(30)
  expect(data.cleared).toBeNull()
  expect(Object.fromEntries(data.headers)).toMatchObject({ 'cache-control':'max-age=60, stale-while-revalidate=300', etag:'catalog-v1' })
  expect(data.unsupported).toMatch(/unsupported|not support/i)
  const home = await request.get('/')
  expect(await home.text()).toContain('Ginko catalog')

})

test('X302 signed revalidation returns the documented unsupported result for a header-only cache', async ({ request }) => {
  const unsigned = await request.post('/api/_content/revalidate', { data: { tags:['catalog'] } })
  expect([401,403]).toContain(unsigned.status())
  let token = process.env.GINKO_CONTENT_REVALIDATE_TOKEN
  if (!token) {
    try { token = (await readFile(new URL('../../.env.custom-source', import.meta.url), 'utf8')).trim().split('=')[1] }
    catch { test.skip(true, 'Signed revalidation needs the project secret in GINKO_CONTENT_REVALIDATE_TOKEN') }
  }
  const body = JSON.stringify({ tags:['catalog'], paths:['/docs/start'] })
  const timestamp = String(Date.now()), id = `custom-source-${test.info().project.name}-${timestamp}`
  const signature = createHmac('sha256',token).update(`${timestamp}.${id}.${body}`).digest('hex')
  const signed = await request.post('/api/_content/revalidate', { data: body, headers:{ 'content-type':'application/json','x-ginko-signature-timestamp':timestamp,'x-ginko-revalidation-event':id,'x-ginko-signature':`sha256=${signature}` } })
  expect(signed.status()).toBe(501)
  expect(await signed.text()).toContain('revalidation_not_supported')
})

test('C288 provider cache hints apply after SSR rendering', async ({ request }) => {
  const api = await request.get('/api/cache')
  await test.info().attach('direct-api-cache-headers', { body:JSON.stringify(api.headers(),null,2),contentType:'application/json' })
  expect.soft(api.headers()['cache-control']).toContain('max-age=60')
  const doc = await request.get('/docs/start')
  const headers = doc.headers()
  await test.info().attach('runtime-ssr-headers', { body: JSON.stringify(headers,null,2),contentType:'application/json' })
  expect(headers['cache-control']).toContain('max-age=60')
})
