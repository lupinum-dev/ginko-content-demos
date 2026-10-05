import { expect } from '@playwright/test'
import { sampledRanks, tokenFor, pathFor } from './scale-common.mjs'
export async function completeness(page, locale) {
  const findings = []
  await page.goto(locale === 'en' ? '/search' : '/de/search')
  await page.waitForLoadState('networkidle')
  for (const rank of sampledRanks) {
    await page.getByTestId('search').fill('')
    await expect(page.getByTestId('search-state')).toHaveText('[]')
    const start = performance.now()
    await page.getByTestId('search').fill(tokenFor(rank))
    // Observe missing results without waiting for an expected hit to appear.
    await page.waitForTimeout(350)
    await expect(page.getByTestId('pending')).toHaveText('false')
    const results = JSON.parse(await page.getByTestId('search-state').innerText())
    findings.push({ rank, locale, token: tokenFor(rank), found: results.some(hit => hit.path === pathFor(rank, locale)), milliseconds: performance.now() - start, returnedPaths: results.map(hit => hit.path), error: await page.getByTestId('error').innerText() })
  }
  return findings
}
