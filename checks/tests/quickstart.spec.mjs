import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('C001 home renders documented Markdown', async ({ page }) => {
  const response = await page.goto('/')
  expect(response.status()).toBe(200)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main h1')).toHaveText('Welcome')
  await expect(page.locator('main')).toContainText('This page comes from content/index.md.')
  await expect(page.getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide')
  await expect(page).toHaveTitle('Welcome')
})

test('C001 second page renders documented Markdown', async ({ page }) => {
  const response = await page.goto('/guide')
  expect(response.status()).toBe(200)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main h1')).toHaveText('Guide')
  await expect(page.locator('main')).toContainText('Both pages belong to the same typed collection.')
  await expect(page).toHaveTitle('Guide')
})

test('C154 unknown route returns HTTP 404 and app-owned fatal error', async ({ page, baseURL }, testInfo) => {
  const url = new URL('/missing', baseURL)
  const response = await fetch(url)
  const html = await response.text()
  const evidence = testInfo.outputPath('missing-response.html')
  await writeFile(evidence, html)
  await testInfo.attach('HTTP 404 response', { path: evidence, contentType: 'text/html' })
  expect(response.status).toBe(404)
  expect(html).toContain('Page not found')
  expect((await page.goto('/missing')).status()).toBe(404)
  await expect(page.getByText('Page not found', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('404', { exact: true }).first()).toBeVisible()
  await expect(page.locator('main h1')).toHaveCount(0)
})

test('C151 SSR payload is reused without duplicate content query on hydration', async ({ page }) => {
  const requests = []
  page.on('request', request => { if (request.url().includes('/_content/')) requests.push(request.url()) })
  const response = await page.goto('/')
  expect(await response.text()).toContain('<h1')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main h1')).toHaveText('Welcome')
  expect(requests).toEqual([])
})

test('C152 client navigation renders both pages without stale-page flashes or console errors', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/api/_content/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 300))
    await route.continue()
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => { window.__demoNavigationMarker = 'same-document' })
  await page.getByTestId('guide-link').click()
  await expect(page).toHaveURL(/\/guide$/)
  expect(await page.locator('main h1').allTextContents()).not.toContain('Welcome')
  await expect(page.locator('main h1')).toHaveText('Guide')
  await page.screenshot({ path: testInfo.outputPath('client-guide.png'), fullPage: true }).then(() => testInfo.attach('Client guide', { path: testInfo.outputPath('client-guide.png'), contentType: 'image/png' }))
  expect(await page.evaluate(() => window.__demoNavigationMarker)).toBe('same-document')
  await page.getByTestId('home-link').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('main h1')).toHaveText('Welcome')
  expect(await page.evaluate(() => window.__demoNavigationMarker)).toBe('same-document')
  await page.waitForLoadState('networkidle')
  await testInfo.attach('Console/page errors', { body: JSON.stringify(errors), contentType: 'application/json' })
  expect(errors).toEqual([])
})

test('C001 both routes deliver server-rendered HTML', async ({ baseURL }, testInfo) => {
  for (const [path, heading, body] of [['/', 'Welcome', 'This page comes from'], ['/guide', 'Guide', 'Both pages belong']]) {
    const response = await fetch(new URL(path, baseURL))
    const html = await response.text()
    const evidence = testInfo.outputPath(`${heading.toLowerCase()}-ssr.html`)
    await writeFile(evidence, html)
    await testInfo.attach(`${heading} SSR response`, { path: evidence, contentType: 'text/html' })
    expect(response.status).toBe(200)
    expect(html).toMatch(new RegExp(`<h1[^>]*>${heading}</h1>`))
    expect(html).toContain(body)
  }
})

// Deliberately an ordinary visitor click, with no interception or router workaround.
test('X001 in-content links navigate client-side', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => { window.__demoNavigationMarker = 'same-document' })
  await page.getByRole('link', { name: 'Read the guide' }).click()
  await expect(page.locator('main h1')).toHaveText('Guide')
  expect(await page.evaluate(() => window.__demoNavigationMarker)).toBe('same-document')
})

// Slice 2b: runtime claims belong here because docs-site has no Nitro handler.
test('C212 [HTTP] runtime delivery negotiates the same public URL', async ({ request }, info) => {
  const observations = []
  for (const accept of ['text/html', 'text/markdown']) {
    const response = await request.get('/guide', { headers: { Accept: accept } })
    observations.push({ accept, status: response.status(), headers: response.headers(), body: await response.text() })
  }
  const path = info.outputPath('negotiation.json')
  await writeFile(path, JSON.stringify(observations, null, 2))
  await info.attach('Runtime negotiation', { path, contentType: 'application/json' })
  expect(observations.map(result => result.status)).toEqual([200, 200])
  expect(observations[0].headers['content-type']).toContain('text/html')
  expect(observations[1].headers['content-type']).toContain('text/markdown')
  expect(observations[1].body).toContain('# Guide')
  expect(observations[1].body).not.toContain('<!DOCTYPE html>')
})

test('C213 [HTTP] Markdown missing public route preserves 404 and recovery links without rewriting API or assets', async ({ request }, info) => {
  const observations = []
  for (const route of ['/missing-agent-page', '/api/missing-agent-api', '/missing-agent-asset.js']) {
    const response = await request.get(route, { headers: { Accept: 'text/markdown' } })
    observations.push({ route, status: response.status(), headers: response.headers(), body: await response.text() })
  }
  const path = info.outputPath('markdown-404.json')
  await writeFile(path, JSON.stringify(observations, null, 2))
  await info.attach('Markdown 404 recovery', { path, contentType: 'application/json' })
  expect(observations.map(result => result.status)).toEqual([404, 404, 404])
  expect(observations[0].headers['content-type']).toContain('text/markdown')
  for (const target of ['/llms.txt', '/llms-full.txt', 'https://ginko-demo-quickstart.vercel.app/']) expect(observations[0].body).toContain(target)
  for (const result of observations.slice(1)) {
    expect(result.headers['content-type']).not.toContain('text/markdown')
    expect(result.body).not.toContain('/llms-full.txt')
  }
})

test('C335 [HTTP] eligible SSR responses expose agent links and configured public content signals', async ({ request }, info) => {
  const observations = []
  for (const route of ['/guide', '/api/missing-agent-api']) {
    const response = await request.get(route, { headers: { Accept: 'text/html' } })
    observations.push({ route, status: response.status(), headers: response.headers() })
  }
  const path = info.outputPath('agent-headers.json')
  await writeFile(path, JSON.stringify(observations, null, 2))
  await info.attach('Agent response headers', { path, contentType: 'application/json' })
  expect(observations[0].headers.link).toContain('/raw/guide.md')
  expect(observations[0].headers.link).toContain('/llms.txt')
  expect(observations[0].headers['content-signal']).toContain('ai-train=no')
  expect(observations[0].headers['content-signal']).toContain('ai-input=yes')
  expect(observations[0].headers['content-signal']).toContain('search=yes')
  expect(observations[1].headers.link).toBeUndefined()
})

test('C212 C335 runtime agent page stays usable in the browser', async ({ page }, info) => {
  await page.goto('/guide')
  await expect(page.locator('main h1')).toHaveText('Guide')
  const response = await page.request.get('/raw/guide.md')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('# Guide')
  const path = info.outputPath('guide-agent.md')
  await writeFile(path, await response.text())
  await info.attach('Raw guide Markdown', { path, contentType: 'text/markdown' })
})
