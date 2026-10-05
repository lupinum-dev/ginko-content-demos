import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import targets from './targets.json' with { type: 'json' }

const demo = process.argv[2] ?? 'quickstart'
if (!targets[demo]) throw new Error(`Unknown demo: ${demo}`)
const url = process.env.BASE_URL ?? targets[demo].BASE_URL
if (!url) throw new Error(`No production BASE_URL configured for ${demo}`)
const root = new URL('../', import.meta.url)
await mkdir(new URL('results/evidence/', root), { recursive: true })
const probe = await fetch(url)
const unavailable = probe.headers.get('x-vercel-error') === 'DEPLOYMENT_NOT_FOUND' ? 'Vercel DEPLOYMENT_NOT_FOUND: no successful production deployment exists' : ''
if (unavailable) await writeFile(new URL(`results/evidence/${demo}-production-unavailable.txt`, root), `${probe.status} ${unavailable}\n${await probe.text()}`)
const code = await new Promise((resolve, reject) => {
  const child = spawn('corepack', ['pnpm', 'exec', 'playwright', 'test'], { cwd: new URL('.', import.meta.url), env: { ...process.env, DEMO: demo, BASE_URL: url, PRODUCTION_UNAVAILABLE: unavailable }, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => resolve(code ?? 1))
})
const date = new Date().toISOString().slice(0, 10)
const resultPath = new URL(`results/${date}-${demo}.json`, root)
const results = JSON.parse(await readFile(resultPath, 'utf8'))
const budgets = { clientJsGzipBytes: null, lighthouseMobilePerformance: null, buildSeconds: null, issues: [] }
if (unavailable) budgets.issues.push(unavailable)
else {
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  const scripts = new Map()
  const pending = []
  page.on('response', response => {
    if (response.request().resourceType() === 'script') pending.push((async () => { scripts.set(response.url(), gzipSync(await response.body()).byteLength) })())
  })
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  const settled = await Promise.allSettled(pending)
  for (const result of settled) if (result.status === 'rejected') throw result.reason
  budgets.clientJsGzipBytes = [...scripts.values()].reduce((sum, bytes) => sum + bytes, 0)
  const path = `results/evidence/${date}-${demo}-client-js.json`
  await writeFile(new URL(path, root), JSON.stringify({ method: 'Unique script response bodies on cold mobile first load, recompressed with Node gzip defaults; excludes subsequent navigation', scripts: Object.fromEntries(scripts), total: budgets.clientJsGzipBytes }, null, 2) + '\n')
  budgets.clientJsEvidence = path
} catch (error) { budgets.issues.push(`Client JS measurement blocked: ${error.message}`) }
finally { await browser?.close() }
let chrome
try {
  chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox'] })
  const audit = await lighthouse(url, { port: chrome.port, output: 'json', onlyCategories: ['performance'], formFactor: 'mobile', logLevel: 'error' })
  if (!audit || audit.lhr.runtimeError) throw new Error(audit?.lhr.runtimeError?.message ?? 'No Lighthouse report')
  budgets.lighthouseMobilePerformance = Math.round(audit.lhr.categories.performance.score * 100)
  const path = `results/evidence/${date}-${demo}-lighthouse.json`
  await writeFile(new URL(path, root), audit.report)
  budgets.lighthouseEvidence = path
} catch (error) { budgets.issues.push(`Lighthouse measurement blocked: ${error.message}`) }
finally { await chrome?.kill() }
}
try { budgets.buildSeconds = JSON.parse(await readFile(new URL(`results/evidence/build-${demo}.json`, root), 'utf8')).seconds }
catch { budgets.issues.push('No local build timing found; run pnpm build to record it.') }
results[0].budgets = budgets
await writeFile(resultPath, JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ url, claims: results.map(({ claim, status }) => ({ claim, status })), budgets }, null, 2))
process.exitCode = code || (budgets.issues.length || results.some(result => result.status !== 'pass') ? 1 : 0)
