import { defineConfig } from '@playwright/test'
import targets from './targets.json' with { type: 'json' }
const demo = process.env.DEMO ?? 'quickstart'
if (!targets[demo]) throw new Error(`Unknown demo: ${demo}`)
export default defineConfig({
  testDir: './tests',
  testMatch: `${demo}.spec.mjs`,
  outputDir: `../results/evidence/${demo}-playwright`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['line'], ['./reporter.mjs']],
  use: { baseURL: process.env.BASE_URL ?? targets[demo].BASE_URL, browserName: 'chromium', screenshot: 'on', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', grepInvert: /\[HTTP\]/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
})
