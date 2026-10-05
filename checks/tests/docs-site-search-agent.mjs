import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import routes from '../docs-site-routes.json' with { type: 'json' }
import queries from '../search-queries.json' with { type: 'json' }
import targets from '../targets.json' with { type: 'json' }

async function state(page) { return JSON.parse(await page.getByTestId('probe-state').innerText()) }
async function save(info, name, value) {
  const path = info.outputPath(name)
  await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  await info.attach(name, { path, contentType: name.endsWith('.json') ? 'application/json' : 'text/plain' })
}

for (const query of queries) {
  test(`${query.kind === 'no-match' ? 'X003' : query.kind === 'typo' ? 'X004' : 'C175 X005'} search query ${query.query}`, async ({ page }, info) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const started = await page.evaluate(() => performance.now())
    await page.getByTestId('search-input').fill(query.query)
    // Wait for Vue to flush the query-driven result render, including the empty case.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const elapsed = await page.evaluate(() => performance.now()) - started
    const hits = await page.getByTestId('search-result').evaluateAll(items => items.map(item => ({ title: item.querySelector('a').textContent, path: item.querySelector('a').getAttribute('href'), snippet: item.querySelector('p').textContent, collection: item.getAttribute('data-collection') })))
    const rank = query.expected ? hits.findIndex(hit => hit.path.split('#')[0] === query.expected) + 1 : null
    await save(info, 'search-query.json', { ...query, top3: hits.slice(0, 3), rank: rank || null, ms: Math.round(elapsed * 100) / 100, method: 'Browser performance clock: fill through two animation frames; includes automation and render time', viewport: info.project.name })
    if (!query.expected) {
      expect(hits).toEqual([])
      await expect(page.getByTestId('search-empty')).toBeVisible()
    } else {
      expect(rank).toBe(1)
      expect(hits[0].collection).toBe('docs')
      if (query.kind === 'heading' || query.kind === 'body') expect(hits[0].snippet.length).toBeGreaterThan(0)
      await page.getByTestId('search-result').first().getByRole('link').click()
      await expect(page).toHaveURL(new RegExp(query.expected))
      const fragment = new URL(page.url()).hash.slice(1)
      if (fragment) await expect(page.getByTestId('document').locator(`[id="${fragment}"]`)).toHaveCount(1)
    }
  })
}

test('C174 empty config enables default MiniSearch and quickstart exposes disabled error', async ({ page }, info) => {
  await page.goto('/')
  await page.getByTestId('search-input').fill('Installation')
  await expect(page.getByTestId('search-result').first()).toContainText('Installation')
  await page.goto(`${targets.quickstart.BASE_URL}/search-status`)
  await expect(page.getByTestId('disabled-search-error')).toContainText(/disabled/i)
  await expect(page.getByTestId('disabled-search-results')).toHaveText('[]')
  await save(info, 'disabled-search.txt', await page.getByTestId('disabled-search-error').innerText())
})

test('C178 complete index initializes before query and then searches offline', async ({ page }, info) => {
  const requests = []
  page.on('response', response => { if (response.url().includes('/search/index.json') || response.url().includes('/_payload.json')) requests.push(response) })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(requests.length).toBeGreaterThan(0)
  const transfers = []
  for (const response of requests) {
    const body = await response.body()
    transfers.push({ url: response.url(), bytes: body.length, gzipBytes: gzipSync(body).length, body: body.toString(), timing: response.request().timing() })
  }
  const response = await page.request.get('/api/_content/search/index.json')
  const records = await response.json()
  await save(info, 'search-index.json', { method: 'Nuxt may carry the complete records in its SSR payload instead of a separate index request.', transfers, records })
  expect([...new Set(records.filter(record => record.collection === 'docs').map(record => record.path))].sort()).toEqual([...routes].sort())
  expect(transfers.map(transfer => transfer.body).join('')).toContain('headings')
  expect(transfers.map(transfer => transfer.body).join('')).toContain('Create a workspace')
  await page.context().setOffline(true)
  await page.getByTestId('search-input').fill('workspace')
  await expect(page.getByTestId('search-result').first().locator('a')).toHaveAttribute('href', /\/docs\/start\/installation/)
})

test('C177 data collections do not enter public search', async ({ page }, info) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const response = await page.request.get('/api/_content/search/index.json')
  const records = await response.json()
  await save(info, 'public-search-collections.json', [...new Set(records.map(record => record.collection))])
  expect(records.some(record => record.collection === 'settings')).toBe(false)
})

test('C182 headless state exposes query results empty and loading error', async ({ page }, info) => {
  await page.goto('/search-probe')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('probe-query').fill('Installation')
  await expect.poll(async () => (await state(page)).hasResults).toBe(true)
  const successful = await state(page)
  expect(successful.pending).toBe(false)
  expect(successful.error).toBeNull()
  await page.getByTestId('probe-query').fill('zzzxqvnosuchword987654321')
  await expect.poll(async () => (await state(page)).isEmpty).toBe(true)
  await save(info, 'headless-success.json', { successful, empty: await state(page) })
  // Only the external HTTP dependency is intercepted; no product logic is mocked.
  // Drop the Nuxt payload to exercise a cold index load rather than its SSR cache.
  await page.route('**/_payload.json*', route => route.abort('failed'))
  await page.route('**/search/index.json', route => route.fulfill({ status: 503, body: 'Search unavailable' }))
  await page.goto('/search-probe')
  await page.waitForLoadState('networkidle')
  await expect.poll(async () => (await state(page)).error).not.toBeNull()
  const failed = await state(page)
  await save(info, 'headless-error.json', failed)
  expect(failed.results).toEqual([])
  expect(failed.pending).toBe(false)

})

test('C183 collection adds files and searchNavigation while omitted collection stays empty', async ({ page }, info) => {
  await page.goto('/search-probe')
  await page.waitForLoadState('networkidle')
  expect((await state(page)).files).toEqual([])
  expect((await state(page)).searchNavigation).toEqual([])
  await page.goto('/search-collection')
  await page.waitForLoadState('networkidle')
  await expect.poll(async () => (await state(page)).files.length).toBeGreaterThan(0)
  const collection = await state(page)
  await save(info, 'collection-search.json', collection)
  expect(collection.searchNavigation.length).toBeGreaterThan(0)
})

test('C184 reactive initial query limit and locale update search', async ({ page }, info) => {
  await page.goto('/search-probe')
  await page.waitForLoadState('networkidle')
  expect((await state(page)).query).toBe('Installation')
  await page.getByTestId('probe-query').fill('Sharing')
  await expect.poll(async () => (await state(page)).query).toBe('Sharing')
  await expect.poll(async () => (await state(page)).results.length).toBeGreaterThan(1)
  await page.getByTestId('probe-limit').fill('1')
  await expect.poll(async () => (await state(page)).results.length).toBe(1)
  await page.getByTestId('probe-locale').selectOption('de')
  await expect.poll(async () => (await state(page)).results.length).toBe(0)
  await save(info, 'reactive-locale.json', await state(page))
  await page.getByTestId('probe-locale').selectOption({ label: 'All' })
  await expect.poll(async () => (await state(page)).results.length).toBe(1)
})

test('C185 headless highlight select reset and shared combobox keyboard navigation', async ({ page }, info) => {
  await page.goto('/search-probe')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('probe-query').fill('Installation')
  await expect.poll(async () => (await state(page)).results.length).toBeGreaterThan(1)
  await page.getByTestId('probe-next').click()
  expect((await state(page)).activeIndex).toBe(0)
  await page.getByTestId('probe-next').click()
  expect((await state(page)).activeIndex).toBe(1)
  await page.getByTestId('probe-previous').click()
  expect((await state(page)).activeIndex).toBe(0)
  await page.getByTestId('probe-select').click()
  expect((await state(page)).selected.path).toBe('/docs/start/installation')
  expect(new URL(page.url()).pathname).toBe('/search-probe')
  await page.getByTestId('probe-reset').click()
  expect((await state(page)).query).toBe('')
  expect((await state(page)).activeIndex).toBe(-1)
  await page.getByTestId('search-input').fill('Formatting')
  await page.getByTestId('search-input').press('ArrowDown')
  await expect(page.getByTestId('search-input')).toHaveAttribute('aria-activedescendant', 'docs-search-option-0')
  await page.getByTestId('search-input').press('Enter')
  await expect(page).toHaveURL(/\/docs\/guides\/markdown#formatting$/)
  await save(info, 'keyboard-destination.txt', page.url())
})

test('C222 C223 C224 agent path helpers project root nested and localized routes', async ({ page }, info) => {
  await page.goto('/agent-paths')
  await page.waitForLoadState('networkidle')
  const examples = JSON.parse(await page.getByTestId('agent-paths').innerText())
  await save(info, 'agent-paths.json', examples)
  expect(examples.slice(0, 3)).toEqual([
    { route: '/', normalized: '/', markdown: '/index.md', raw: '/raw/index.md' },
    { route: '/docs/start', normalized: '/docs/start', markdown: '/docs/start/index.md', raw: '/raw/docs/start.md' },
    { route: '/de/docs/start', normalized: '/de/docs/start', markdown: '/de/docs/start/index.md', raw: '/raw/de/docs/start.md' }
  ])
  expect(examples[3].normalized).toBe('/docs/start')
})

test('C203 C207 agent index is linked from the live shared shell', async ({ page }, info) => {
  await page.goto('/')
  await page.getByTestId('llms-link').click()
  await expect(page.locator('body')).toContainText('Fieldnote documentation')
  await expect(page.locator('body')).toContainText('/raw/docs/start/installation.md')
  await save(info, 'visible-agent-index.txt', await page.locator('body').innerText())
})

// HTTP-only checks execute once, in the desktop project.
test('C202 [HTTP] every public docs page has normalized raw Markdown', async ({ request }, info) => {
  const responses = []
  for (const route of routes) {
    const response = await request.get(`/raw${route}.md`)
    responses.push({ route, status: response.status(), headers: response.headers(), body: await response.text() })
  }
  await save(info, 'all-raw-pages.json', responses)
  expect(responses.filter(response => response.status !== 200).map(response => ({ route: response.route, status: response.status }))).toEqual([])
  const markdown = responses.find(response => response.route === '/docs/guides/markdown').body
  expect(markdown).toContain('## Formatting')
  expect(markdown).toContain('[Components](/raw/docs/guides/components.md)')
  expect(markdown).toContain('const observation')
})

test('C203 [HTTP] sectioned index links all resolve with absolute canonical URLs', async ({ request, baseURL }, info) => {
  const response = await request.get('/llms.txt')
  const text = await response.text()
  await save(info, 'llms.txt', text)
  expect(response.status()).toBe(200)
  expect(text).toContain('## Documentation')
  const links = [...text.matchAll(/\]\((https:[^)]+\.md)\)/g)].map(match => match[1])
  expect(links.length).toBeGreaterThan(10)
  const results = []
  for (const url of links) { const raw = await request.get(url); results.push({ url, status: raw.status() }); expect(url).toMatch(new RegExp(`^${baseURL}/raw/`)) }
  await save(info, 'index-links.json', results)
  expect(results.filter(result => result.status !== 200)).toEqual([])
})

test('C204 C206 C216 [HTTP] full output policies metadata and forbidden-content exclusions', async ({ request }, info) => {
  const index = await (await request.get('/llms.txt')).text()
  const full = await (await request.get('/llms-full.txt')).text()
  const support = await (await request.get('/raw/support.md')).text()
  await save(info, 'llms-full.txt', full)
  await save(info, 'support.md', support)
  expect(full).toContain('EXAMPLES_FULL_ONLY_SENTINEL')
  expect(index).not.toContain('/raw/inspect.md')
  expect(index).toContain('/raw/support.md')
  expect(full).not.toContain('Ask your team notebook owner for help.')
  expect(support).toContain('title:')
  expect(support).toContain('route:')
  const artifactLinks = [...new Set([...index.matchAll(/\]\((https:[^)]+\.md)\)/g), ...full.matchAll(/\]\((https:[^)]+\.md)\)/g)].map(match => match[1]))]
  const artifacts = [index, full, support]
  for (const url of artifactLinks) artifacts.push(await (await request.get(url)).text())
  for (const forbidden of ['DRAFT_SENTINEL_DO_NOT_PUBLISH', 'PARTIAL_SENTINEL_DO_NOT_PUBLISH', 'DATA_SENTINEL_NOT_A_PAGE', 'COMMENT_SENTINEL_DO_NOT_PUBLISH']) expect(artifacts.join('\n')).not.toContain(forbidden)
  for (const route of ['/raw/docs/reference/draft.md', '/raw/docs/reference/shared.md', '/raw/settings/site.md']) expect((await request.get(route)).status()).toBe(404)
})

test('C207 [HTTP] static HTML and agent files coexist without portable negotiation', async ({ request }, info) => {
  const observations = []
  for (const path of ['/docs/start', '/raw/docs/start.md', '/llms.txt', '/llms-full.txt', '/docs/start/index.md']) {
    const response = await request.get(path, { headers: { Accept: 'text/markdown' } })
    observations.push({ path, status: response.status(), headers: response.headers(), body: await response.text() })
  }
  await save(info, 'static-delivery.json', observations)
  expect(observations.slice(0, 4).map(result => result.status)).toEqual([200, 200, 200, 200])
  expect(observations[0].headers['content-type']).toContain('text/html')
  expect(observations[4].status).toBe(404)
})

test('C211 [HTTP] agent false baseline disables raw indexes and middleware', async ({ request }, info) => {
  const origin = 'https://ginko-demo-docs-site-ajgbnttsi-lupinum.vercel.app'
  const results = []
  for (const path of ['/raw/docs/start.md', '/llms.txt', '/llms-full.txt', '/docs/start']) {
    const response = await request.get(origin + path, { headers: { Accept: 'text/markdown' } })
    results.push({ path, status: response.status(), headers: response.headers(), body: await response.text() })
  }
  await save(info, 'disabled-baseline.json', { origin, deploymentId: 'dpl_9uBoDTjUBGJZm2PYDeDE1xGjtARs', results })
  expect(results.slice(0, 3).map(result => result.status)).toEqual([404, 404, 404])
  expect(results[3].status).toBe(200)
  expect(results[3].headers.link).toBeUndefined()
  expect(results[3].headers['content-type']).toContain('text/html')
})

test('C214 C215 C219 C220 [HTTP] app page serializer fence metadata and numeric source order', async ({ request }, info) => {
  const responses = {}
  for (const path of ['/support', '/raw/support.md', '/raw/docs/guides/components.md', '/raw/docs/guides/markdown.md', '/llms.txt', '/llms-full.txt']) {
    const response = await request.get(path)
    responses[path] = { status: response.status(), body: await response.text() }
  }
  await save(info, 'agent-rendering.json', responses)
  expect(Object.values(responses).every(result => result.status === 200)).toBe(true)
  expect(responses['/support'].body).toContain('Ask your team notebook owner for help.')
  expect(responses['/raw/support.md'].body).toContain('# Support')
  expect(responses['/raw/docs/guides/components.md'].body).toMatch(/> \*\*[^*]+\*\*/)
  for (const path of ['/raw/docs/guides/markdown.md', '/llms-full.txt']) expect(responses[path].body).toContain('```ts [note.ts]')
  for (const path of ['/llms.txt', '/llms-full.txt']) expect(responses[path].body.indexOf('Installation')).toBeLessThan(responses[path].body.indexOf('Updates'))
})

test('C361 [HTTP] default ignored pre tags are absent from index while prose remains', async ({ request }, info) => {
  const response = await request.get('/api/_content/search/index.json')
  const records = await response.json()
  const markdown = records.filter(record => record.path.split('#')[0] === '/docs/guides/markdown')
  await save(info, 'ignored-tags.json', markdown)
  const text = markdown.map(record => record.content).join('\n')
  expect(text).toContain('Keep observations short')
  expect(text).not.toContain('const observation')
})

test('X006 search snippets keep word boundaries between Markdown blocks', async ({ page }, info) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('search-input').fill('Formatting')
  await expect(page.getByTestId('search-result').first()).toContainText('Formatting')
  const snippet = await page.getByTestId('search-snippet').first().innerText()
  await save(info, 'snippet-word-boundaries.txt', snippet)
  expect(snippet).toContain('Record a place Record a date')
})
