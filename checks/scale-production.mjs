import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { latency } from './scale-latency.mjs'
import { tokenFor, pathFor } from './scale-common.mjs'

const baseURL = process.env.BASE_URL ?? 'https://ginko-demo-scale.vercel.app'
const evidence = new URL('../results/evidence/scale/', import.meta.url)
await mkdir(evidence, { recursive: true })
const result = { baseURL, startedAt: new Date().toISOString(), issues: [] }
// First deliberate page request from this runner, before any browser checks.
result.latency = await latency(baseURL)
result.coldStart = { visible: false, firstRequest: result.latency.firstRequest, explanation: 'First observed request is recorded, but no reliable cold-start marker is exposed. Deployment health checks and earlier traffic may have warmed the function.' }
await writeFile(new URL('production-latency.json', evidence), JSON.stringify(result.latency, null, 2) + '\n')
result.search = []
for (const locale of ['en', 'de']) for (const rank of [1, 50, 100, 101, 200, 300, 500, 700, 900, 1000]) {
  const url = new URL(`/api/_content/search?q=${tokenFor(rank)}&locale=${locale}`, baseURL)
  const start = performance.now()
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
    const body = await response.text()
    const hits = JSON.parse(body)
    const row = { locale, rank, token: tokenFor(rank), url: url.href, status: response.status, milliseconds: performance.now() - start, found: Array.isArray(hits) && hits.some(hit => hit.path === pathFor(rank, locale)), returnedPaths: Array.isArray(hits) ? hits.map(hit => hit.path) : [], evidence: `results/evidence/scale/api-${locale}-${rank}.json` }
    await writeFile(new URL(`api-${locale}-${rank}.json`, evidence), body)
    result.search.push(row)
  } catch (error) { result.search.push({ locale, rank, token: tokenFor(rank), url: url.href, found: false, milliseconds: performance.now() - start, error: error.message }); result.issues.push(`Search API ${locale}/${rank}: ${error.message}`) }
}
const testCode = await new Promise((resolve, reject) => {
  const child = spawn('corepack', ['pnpm', 'exec', 'playwright', 'test'], { cwd: new URL('.', import.meta.url), env: { ...process.env, DEMO: 'scale', BASE_URL: baseURL, RESULTS_PATH: new URL('production-claims.json', evidence).pathname }, stdio: 'inherit' })
  child.on('error', reject); child.on('exit', resolve)
})
result.testExitCode = testCode
result.claims = JSON.parse(await readFile(new URL('production-claims.json', evidence), 'utf8'))
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  const scripts = new Map()
  const pending = []
  page.on('response', response => { if (response.request().resourceType() === 'script') pending.push((async () => scripts.set(response.url(), gzipSync(await response.body()).byteLength))()) })
  await page.goto(new URL(pathFor(1), baseURL).href)
  await page.waitForLoadState('networkidle')
  await Promise.all(pending)
  result.clientJs = { method: 'Cold mobile first docs-page load; unique script response bodies recompressed using Node gzip defaults; includes scripts loaded before networkidle.', gzipBytes: [...scripts.values()].reduce((sum, bytes) => sum + bytes, 0), scripts: Object.fromEntries(scripts) }
  await writeFile(new URL('client-js.json', evidence), JSON.stringify(result.clientJs, null, 2) + '\n')
} catch (error) { result.issues.push(`Client JS: ${error.message}`) }
finally { await browser?.close() }
let chrome
try {
  chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox'] })
  const audit = await lighthouse(new URL(pathFor(1), baseURL).href, { port: chrome.port, output: 'json', onlyCategories: ['performance'], formFactor: 'mobile', logLevel: 'error' })
  if (!audit || audit.lhr.runtimeError) throw new Error(audit?.lhr.runtimeError?.message ?? 'No Lighthouse report')
  result.lighthouse = { mobilePerformance: Math.round(audit.lhr.categories.performance.score * 100), url: audit.lhr.finalDisplayedUrl, evidence: 'results/evidence/scale/lighthouse.json' }
  await writeFile(new URL('lighthouse.json', evidence), audit.report)
} catch (error) { result.issues.push(`Lighthouse: ${error.message}`) }
finally { await chrome?.kill() }
await writeFile(new URL('production.json', evidence), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ baseURL, tests: testCode, latency: result.latency.summary, search: result.search.map(({ locale, token, found, milliseconds }) => ({ locale, token, found, milliseconds })), clientJs: result.clientJs?.gzipBytes, lighthouse: result.lighthouse, issues: result.issues }, null, 2))
process.exitCode = testCode || (result.issues.length ? 1 : 0)
