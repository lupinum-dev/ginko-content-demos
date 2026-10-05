import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('C001 home renders documented Markdown', async ({ page }) => {
  const response = await page.goto('/')
  expect(response.status()).toBe(200)
  await expect(page.locator('main h1')).toHaveText('Welcome')
  await expect(page.locator('main')).toContainText('This page comes from content/index.md.')
  await expect(page.getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide')
  await expect(page).toHaveTitle('Welcome')
})

test('C001 second page renders documented Markdown', async ({ page }) => {
  const response = await page.goto('/guide')
  expect(response.status()).toBe(200)
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
  await page.getByRole('link', { name: 'Read the guide' }).click()
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

test('C200 serverless filesystem snapshot serves both routes as SSR HTML', async ({ baseURL }, testInfo) => {
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
