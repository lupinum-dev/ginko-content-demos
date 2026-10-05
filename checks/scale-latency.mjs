import { loadavg } from 'node:os'
import { pathFor, pageRanks, distribution } from './scale-common.mjs'
export async function latency(baseURL, requests = 50) {
  const samples = []
  const startLoad = loadavg()
  for (let i = 0; i < requests; i++) {
    const rank = pageRanks[i % 5]
    const locale = i % 5 >= 3 ? 'de' : 'en'
    const path = pathFor(rank, locale)
    const start = performance.now()
    try {
      const response = await fetch(new URL(path, baseURL), { signal: AbortSignal.timeout(60000) })
      const html = await response.text()
      samples.push({ path, milliseconds: performance.now() - start, status: response.status, bytes: Buffer.byteLength(html), documentPresent: html.includes(`zq${String(rank).padStart(4, '0')}`), linkHeader: response.headers.get('link'), vercelId: response.headers.get('x-vercel-id'), cache: response.headers.get('x-vercel-cache'), serverTiming: response.headers.get('server-timing') })
    } catch (error) { samples.push({ path, milliseconds: performance.now() - start, error: error.message }) }
    if (i === 0 || (i + 1) % 10 === 0) console.log(JSON.stringify({ latencyProgress: i + 1, baseURL, latest: samples.at(-1) }))
  }
  return { baseURL, method: '50 sequential GETs, five pages round-robin, includes full response body; nearest-rank p50/p95. First request included; no cache buster.', startLoad, endLoad: loadavg(), summary: distribution(samples.map(row => row.milliseconds)), firstRequest: samples[0], samples }
}
