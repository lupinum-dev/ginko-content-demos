import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const guidePaths = ['/guides/getting-started', '/de/leitfaden/erste-schritte', '/ja/gaido/hajimeni']
const titles = ['Getting started', 'Erste Schritte', 'はじめに']
async function facts(page) {
  await page.goto('/inspect')
  return JSON.parse(await page.getByTestId('facts').textContent())
}
async function responseEvidence(response, testInfo, name) {
  const body = await response.text()
  const path = testInfo.outputPath(name)
  await writeFile(path, body)
  await testInfo.attach(name, { path, contentType: response.headers.get('content-type') ?? 'text/plain' })
  return body
}

test('C165 C169 C172 shared SSR header switches to proven translated slugs', async ({ page, baseURL }, info) => {
  const response = await fetch(new URL(guidePaths[0], baseURL))
  const html = await responseEvidence(response, info, 'shared-header.html')
  expect(response.status).toBe(200)
  expect(html.split('</header>')[0]).toContain('href="/de/leitfaden/erste-schritte"')
  const requests = []
  page.on('request', r => { if (r.url().includes('/api/_content/')) requests.push(r.url()) })
  await page.goto(guidePaths[0])
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
  await expect(page.getByTestId('header-de')).toHaveAttribute('href', guidePaths[1])
  await page.getByTestId('header-de').click()
  await expect(page).toHaveURL(new RegExp(guidePaths[1]+'$'))
  await expect(page.locator('article h1')).toHaveText(titles[1])
  await page.getByTestId('header-ja').click()
  await expect(page).toHaveURL(new RegExp(guidePaths[2]+'$'))
  await expect(page.locator('article h1')).toHaveText(titles[2])
})

test('C164 C166 C158 translated mounts preserve identity and public document links', async ({ page }) => {
  const data = await facts(page)
  expect(data.translated.map(x => x.canonicalKey)).toEqual(['1', '1', '1'])
  expect(data.translated.map(x => x.route.resolvedPath)).toEqual(guidePaths)
  for (const [i, path] of guidePaths.entries()) {
    expect((await page.goto(path)).status()).toBe(200)
    await expect(page.locator('article h1')).toHaveText(titles[i])
    await expect(page.getByTestId('resolved-link')).toHaveAttribute('href', path)
    await page.getByTestId('resolved-link').click()
    await expect(page.locator('article h1')).toHaveText(titles[i])
  }
})

test('C093 canonical and mounted localized selectors identify the same document', async ({ page }) => {
  const data = await facts(page)
  expect(data.canonical.id).toBe(data.mounted.id)
  expect(data.canonical.title).toBe('Einführung')
  expect(data.canonical.route.resolvedPath).toBe('/de/docs/intro')
})

test('C102 C134 C135 C136 C137 exact configured default and ordered fallback explanations', async ({ page }, info) => {
  const data = await facts(page)
  await info.attach('query results', { body: JSON.stringify(data), contentType: 'application/json' })
  expect(data.exact.doc).toBeNull()
  expect(data.exact.explain).toBeTruthy()
  for (const [key, locale, title] of [['chain', 'de', 'German chain'], ['defaultOnly', 'en', 'English chain'], ['ordered', 'en', 'English chain']]) {
    expect(data[key].doc.title).toBe(title)
    expect(data[key].doc.resolution).toEqual({ requested: { locale: 'ja' }, resolved: { locale }, usedFallback: true })
    expect(data[key].explain).toBeTruthy()
    expect(JSON.stringify(data[key].explain)).toContain('ja')
  }
})

test('C167 C168 fallback page tells the reader and exposes only proven variants and current fallback', async ({ page }) => {
  await page.goto('/de/docs/english-only')
  await expect(page.getByTestId('fallback')).toHaveText('This page is not available in the requested language.')
  await expect(page.locator('article h1')).toHaveText('English only')
  const data = JSON.parse(await page.getByTestId('envelope').textContent())
  expect(data.resolution).toEqual({ requested: { locale: 'de' }, resolved: { locale: 'en' }, usedFallback: true })
  expect(data.route.alternates).toEqual([{ locale: 'en', path: '/docs/english-only', source: 'variant' }, { locale: 'de', path: '/de/docs/english-only', source: 'fallback', resolvedLocale: 'en' }])
})

test('C108 projected population retains the translated reference', async ({ page }) => {
  await page.goto('/de/inspect')
  const data = JSON.parse(await page.getByTestId('facts').textContent())
  expect(data.populated.title).toBe('Einführung')
  expect(data.populated.author.title).toBe('Deutsche Autorin')
  expect(data.populated.author.locale).toBe('de')
  expect(data.populated).not.toHaveProperty('description')
})

test('C138 locale-scoped navigation changes with shared-header language', async ({ page }) => {
  await page.goto('/docs/intro')
  await expect(page.getByTestId('sidebar')).toContainText('Introduction')
  await page.getByTestId('header-de').click()
  await expect(page.getByTestId('sidebar')).toContainText('Einführung')
  await expect(page.getByTestId('sidebar')).not.toContainText('Introduction')
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Erste Schritte' })).toHaveAttribute('href', guidePaths[1])
})

test('C155 reactive locale getter and refresh update content', async ({ page }) => {
  await page.goto('/docs/intro')
  await page.getByTestId('header-de').click()
  await page.getByTestId('refresh').click()
  await expect(page.locator('article h1')).toHaveText('Einführung')
  await expect(page.getByTestId('page-status')).toHaveText('success')
})

test('C170 missing alternate has a disabled shared-header link', async ({ page }) => {
  await page.goto('/docs/english-only')
  await expect(page.getByTestId('header-ja')).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByTestId('header-de')).toHaveAttribute('aria-disabled', 'true')
})

test('C171 language switching preserves query and hash', async ({ page }) => {
  await page.goto(guidePaths[0]+'?ref=visitor#details')
  await expect(page.getByTestId('header-de')).toHaveAttribute('href', guidePaths[1]+'?ref=visitor#details')
  await page.getByTestId('header-de').click()
  await expect(page).toHaveURL(new RegExp(guidePaths[1]+'\\?ref=visitor#details$'))
})

test('C173 application-only page uses the shared layout callback', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('header-de')).toHaveAttribute('href', '/de')
  await page.getByTestId('header-de').click()
  await expect(page.locator('main h1')).toHaveText('Multilingual content')
})

test('C334 named I18n quick links preserve static params and query', async ({ page }) => {
  for (const [source, target] of [[guidePaths[0], '/pricing/team?ref=docs'], [guidePaths[1], '/de/preise/team?ref=docs']]) {
    await page.goto(source)
    await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('href', target)
    await page.getByRole('link', { name: 'Pricing', exact: true }).click()
    await expect(page.getByTestId('plan')).toHaveText('team')
    await expect(page.getByTestId('ref')).toHaveText('docs')
  }
})

test('C303 collection-local path slug and prefix options reject inherited policy', async ({ page }) => {
  const data = await facts(page)
  expect(data.paths.slug).toBe('/de/dokumentation/intro')
  expect(data.paths.path).toBe('/de/dokumentation/intro')
  expect(data.paths.noPrefix).toBe('/dokumentation/intro')
  expect(data.paths.inheritedError).toMatch(/locale|i18n|policy/i)
})

test('X003 negation cannot escape requested locale', async ({ page }, info) => {
  const data = await facts(page)
  await info.attach('negated locale result E-A009', { body: JSON.stringify(data.notLocale), contentType: 'application/json' })
  expect(data.notLocale).toEqual([])
})

test('C179 C188 generated Pagefind shards return only active-locale results and collection data', async ({ page }, info) => {
  const requests = []
  page.on('request', r => { if (r.url().includes('/pagefind/')) requests.push(r.url()) })
  await page.goto('/de/search')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('search').fill('biodiversity')
  await expect(page.getByTestId('results').locator('li')).not.toHaveCount(0)
  await expect(page.getByTestId('search-error')).toBeEmpty()
  const links = await page.getByTestId('results').locator('a').evaluateAll(a => a.map(x => x.getAttribute('href')))
  expect(links.every(x => x.startsWith('/de/'))).toBe(true)
  expect(await page.getByTestId('search-files').textContent()).toContain('Einführung')
  expect(await page.getByTestId('search-files').textContent()).not.toContain('Introduction')
  await info.attach('Pagefind requests', { body: JSON.stringify(requests), contentType: 'application/json' })
  expect(requests.some(x => /pf_(index|fragment)|\.wasm|\.pagefind/.test(x))).toBe(true)
  await page.getByTestId('header-ja').click()
  await expect(page).toHaveURL(/\/ja\/search$/)
  await expect(page.getByTestId('search-files')).toContainText('紹介')
  await expect(page.getByTestId('search')).toHaveValue('')
  await page.getByTestId('search').fill('biodiversity')
  await expect(page.getByTestId('results').locator('li')).not.toHaveCount(0)
  await expect.poll(() => page.getByTestId('results').locator('a').evaluateAll(a => a.map(x => x.getAttribute('href')).sort())).toEqual(['/ja/docs/intro', '/ja/gaido/hajimeni'])
})

test('X005 Japanese search finds Japanese content', async ({ page }) => {
  await page.goto('/ja/search')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('search').fill('生物多様性')
  await expect(page.getByTestId('results').locator('li')).not.toHaveCount(0)
  await expect(page.getByTestId('search-error')).toBeEmpty()
  expect((await page.getByTestId('results').locator('a').evaluateAll(a => a.map(x => x.getAttribute('href')))).every(x => x.startsWith('/ja/'))).toBe(true)
})

test('C187 search without locale returns multiple languages', async ({ page }) => {
  await page.goto('/search')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('all-search').fill('biodiversity')
  await expect.poll(async () => JSON.parse(await page.getByTestId('all-results').textContent()).length).toBeGreaterThan(0)
  const results = JSON.parse(await page.getByTestId('all-results').textContent())
  expect([...new Set(results.map(x => x.locale))].sort()).toEqual(['de', 'en', 'ja'])
})

function alternates(entry) {
  return [...entry.matchAll(/<xhtml:link\s+([^>]+)>/g)].map(([_, attributes]) => ({ hreflang: /hreflang="([^"]+)"/.exec(attributes)?.[1], href: /href="([^"]+)"/.exec(attributes)?.[1] }))
}
async function sitemap(baseURL, info) {
  const index = await responseEvidence(await fetch(new URL('/sitemap_index.xml', baseURL)), info, 'sitemap-index.xml')
  const paths = [...index.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1])
  const bodies = []
  for (const [i, path] of paths.entries()) {
    const response = await fetch(path)
    expect(response.status).toBe(200)
    bodies.push(await responseEvidence(response, info, `sitemap-${i}.xml`))
  }
  return { index, bodies }
}

test('C192 C195 sitemap index contains reciprocal real translated alternates and x-default', async ({ baseURL }, info) => {
  const { index, bodies } = await sitemap(baseURL, info)
  expect(index).toContain('<sitemapindex')
  expect(bodies).toHaveLength(3)
  for (const path of guidePaths) {
    const entry = bodies.flatMap(body => body.match(/<url>[\s\S]*?<\/url>/g) ?? []).find(x => x.includes(`<loc>${baseURL}${path}</loc>`))
    expect(entry).toBeTruthy()
    for (const [i, language] of ['en-US', 'de-DE', 'ja-JP'].entries()) expect(alternates(entry)).toContainEqual({ hreflang: language, href: `${baseURL}${guidePaths[i]}` })
    expect(alternates(entry)).toContainEqual({ hreflang: "x-default", href: `${baseURL}${guidePaths[0]}` })
    expect((await fetch(new URL(path, baseURL))).status).toBe(200)
  }
})

test('X004 singleton localized sitemap keeps hreflang and x-default', async ({ baseURL }, info) => {
  const { bodies } = await sitemap(baseURL, info)
  const entry = bodies.flatMap(body => body.match(/<url>[\s\S]*?<\/url>/g) ?? []).find(x => x.includes(`<loc>${baseURL}/docs/english-only</loc>`))
  expect(entry).toBeTruthy()
  expect(alternates(entry)).toContainEqual({ hreflang: "en-US", href: `${baseURL}/docs/english-only` })
  expect(alternates(entry)).toContainEqual({ hreflang: "x-default", href: `${baseURL}/docs/english-only` })
})

test('C205 C217 localized agent indexes raw content metadata and signals', async ({ baseURL }, info) => {
  for (const [prefix, title, heading] of [['', 'Ginko multilingual', 'Introduction'], ['/de', 'Ginko mehrsprachig', 'Einführung'], ['/ja', 'Ginko 多言語', '紹介']]) {
    const indexResponse = await fetch(new URL(prefix+'/llms.txt', baseURL))
    expect(indexResponse.status).toBe(200)
    const index = await responseEvidence(indexResponse, info, `llms${prefix.replace('/', '-') || '-en'}.txt`)
    expect(index).toContain(title)
    const rawResponse = await fetch(new URL('/raw'+prefix+'/docs/intro.md', baseURL))
    expect(rawResponse.status).toBe(200)
    const raw = await responseEvidence(rawResponse, info, `raw${prefix.replace('/', '-') || '-en'}.md`)
    expect(raw).toContain(heading)
    expect(raw).toContain('locale:')
    expect(raw).toContain('collection:')
    expect(index).toContain('AI training: no')
    expect(index).toContain('AI input: yes')
  }
})

for (const [id, reason] of [
  ['C161', 'Content-owned locales without Nuxt I18n require an independent module-setup build; this production demo intentionally installs Nuxt I18n.'],
  ['C163', 'Opt-out and collection-local policy require extra collection fixtures beyond the brief’s two collections; production proves inherited policy only.'],
  ['C181', 'Post-build source mutation and regeneration are filesystem/build checks; a production browser cannot mutate the sealed deployment.']
]) test(`${id} not-live: ${reason}`, async ({}, info) => { info.annotations.push({ type: 'not-live', description: reason }); test.skip(true, reason) })
