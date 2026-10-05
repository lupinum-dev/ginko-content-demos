import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { latency } from './scale-latency.mjs'
import { distribution } from './scale-common.mjs'
import { chromium } from '@playwright/test'
import { completeness } from './scale-browser.mjs'
const evidence = new URL('../results/evidence/scale/', import.meta.url)
const results = ['default', 'off'].map(agent => ({ agent, batches: [] }))
async function withServer(agent, label, action) {
  const port = agent === 'default' ? 4310 : 4311
  const baseURL = `http://127.0.0.1:${port}`
  const log = createWriteStream(new URL(`node-${agent}-${label}.log`, evidence))
  const server = spawn(process.execPath, [new URL(`node-agent-${agent}/server/index.mjs`, evidence).pathname], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port), HOST: '127.0.0.1' } })
  server.stdout.pipe(log); server.stderr.pipe(log)
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Node server did not become ready')), 30000)
      server.stdout.on('data', chunk => { if (chunk.toString().includes('Listening')) { clearTimeout(timeout); resolve() } })
      server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Node server exited ${code}`)) })
    })
    await action(baseURL)
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill('SIGTERM')
      await new Promise(resolve => server.once('exit', resolve))
    }
    log.end()
  }
}
// Alternate builds, with a fresh process for each batch, to reduce time drift.
for (let run = 1; run <= 3; run++) for (const agent of ['default', 'off']) {
  await withServer(agent, run, async baseURL => {
    const batch = await latency(baseURL)
    results.find(row => row.agent === agent).batches.push({ run, ...batch })
    console.log(JSON.stringify({ agent, run, summary: batch.summary, failures: batch.samples.filter(row => row.status !== 200 || !row.documentPresent) }))
  })
}
for (const row of results) {
  row.p50 = distribution(row.batches.map(batch => batch.summary.p50))
  row.p95 = distribution(row.batches.map(batch => batch.summary.p95))
}
await writeFile(new URL('local-latency.json', evidence), JSON.stringify({ method: 'Three alternating on/off pairs; fresh Node process per batch, 50 sequential full-body requests to five pages. No warm-up; first sample retained. Two identical-corpus builds differ only in SCALE_AGENT.', results }, null, 2) + '\n')
await withServer('default', 'search', async baseURL => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } })
    const samples = []
    for (let run = 1; run <= 3; run++) for (const locale of ['en', 'de']) samples.push({ run, locale, samples: await completeness(page, locale) })
    await page.screenshot({ path: new URL('local-search.png', evidence).pathname })
    await writeFile(new URL('local-search.json', evidence), JSON.stringify(samples, null, 2) + '\n')
  } finally { await browser.close() }
})
