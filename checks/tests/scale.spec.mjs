import { test, expect } from '@playwright/test'
import { tokenFor, pathFor } from '../scale-common.mjs'
import { completeness } from '../scale-browser.mjs'

test('C297 representative 2000-document corpus renders both locales with navigation', async ({ page }, info) => {
  for (const [rank, locale] of [[1, 'en'], [101, 'en'], [500, 'de'], [1000, 'de']]) {
    const response = await page.goto(pathFor(rank, locale))
    expect(response.status()).toBe(200)
    await expect(page.getByTestId('document')).toContainText(tokenFor(rank))
    await expect(page.getByTestId('rank')).toHaveText(`Rank: ${rank}`)
    await expect(page.getByTestId('sidebar').getByRole('link')).toHaveCount(1000)
    await expect(page.getByTestId('callout').first()).toBeVisible()
    if (rank < 1000) await expect(page.getByTestId('next')).toHaveAttribute('href', pathFor(rank + 1, locale))
    if (rank > 1) await expect(page.getByTestId('previous')).toHaveAttribute('href', pathFor(rank - 1, locale))
    await page.screenshot({ path: info.outputPath(`${locale}-${rank}.png`), fullPage: false })
  }
  await info.attach('scenario', { body: JSON.stringify({ pages: 4, sidebarLinksPerPage: 1000 }), contentType: 'application/json' })
})

for (const locale of ['en', 'de']) test(`X401 all 20 unique tokens are searchable in ${locale}`, async ({ page }, info) => {
  const findings = await completeness(page, locale)
  expect(findings).toHaveLength(20)
  await info.attach('completeness.json', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
  await page.screenshot({ path: info.outputPath(`${locale}-search.png`), fullPage: false })
  expect(findings.filter(row => row.found).length, JSON.stringify(findings)).toBe(20)
})
