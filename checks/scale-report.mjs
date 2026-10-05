import { readFile, writeFile } from 'node:fs/promises'
import { distribution } from './scale-common.mjs'
const root = new URL('../', import.meta.url)
const evidence = new URL('results/evidence/scale/', root)
const read = async name => JSON.parse(await readFile(new URL(name, evidence), 'utf8'))
const builds = await read('builds.json')
const localLatency = await read('local-latency.json')
const localSearch = await read('local-search.json')
const escaping = await read('escaping.json')
const production = await read('production.json')
const searchIndex = await read('search-index-summary.json')
const anomalies = []
const groups = []
for (const mode of ['ssr', 'static']) for (const n of [200, 1000, 2000]) {
  const rows = builds.runs.filter(row => row.mode === mode && row.n === n && typeof row.repeat === 'number' && row.repeat <= 3)
  groups.push({ mode, n, wallSeconds: distribution(rows.map(row => row.wallSeconds)), peakRssBytes: distribution(rows.map(row => row.peakRssBytes)), outputBytes: distribution(rows.map(row => row.outputBytes)), nuxtBytes: distribution(rows.map(row => row.nuxtBytes)), prerenderedRoutes: rows.map(row => row.prerenderedRoutes), prerenderedHtml: rows.map(row => row.prerenderedHtml), exitCodes: rows.map(row => row.exitCode) })
}
for (const mode of ['ssr', 'static']) for (const [small, large] of [[200, 1000], [200, 2000], [1000, 2000]]) {
  const a = groups.find(row => row.mode === mode && row.n === small)
  const b = groups.find(row => row.mode === mode && row.n === large)
  const pairedReversals = [1, 2, 3].flatMap(repeat => {
    const smallRun = builds.runs.find(row => row.mode === mode && row.n === small && row.repeat === repeat)
    const largeRun = builds.runs.find(row => row.mode === mode && row.n === large && row.repeat === repeat)
    return largeRun.wallSeconds < smallRun.wallSeconds ? [`run ${repeat}: N=${large} ${largeRun.wallSeconds}s < N=${small} ${smallRun.wallSeconds}s`] : []
  })
  if (pairedReversals.length || b.wallSeconds.min < a.wallSeconds.max || b.wallSeconds.median < a.wallSeconds.median) anomalies.push({ result: `${mode} timing reversal: ${pairedReversals.join('; ')}. Fastest N=${large} ${b.wallSeconds.min}s is below slowest N=${small} ${a.wallSeconds.max}s. Medians: N=${small} ${a.wallSeconds.median}s, N=${large} ${b.wallSeconds.median}s.`, expected: 'Brief: larger N never builds faster; rerun and report.', explanation: 'Runs have substantial changing machine load and memory pressure; workload size alone does not explain wall time. Direct reruns are retained in buildRuns. Do not infer scaling from this inversion.' })
}
const searchCounts = localSearch.map(batch => ({ run: batch.run, locale: batch.locale, found: batch.samples.filter(row => row.found).length, missing: batch.samples.filter(row => !row.found).length, total: batch.samples.length }))
for (const locale of ['en', 'de']) {
  const rows = searchCounts.filter(row => row.locale === locale)
  if (rows.some(row => row.total !== 20 || row.found + row.missing !== 20)) throw new Error(`Search totals do not add up to 20 in ${locale}`)
    if (rows.some(row => row.missing)) anomalies.push({ result: `${locale} search completeness: ${rows.map(row => `${row.found}/20`).join(', ')} found over three local runs.`, expected: 'Complete default MiniSearch record set must find all sampled owning pages, including documents 101 and 1000 (DESIGN.md; installed search-engines.md; X401).', explanation: 'Consistent with audit E-A003: indexing is capped at the first 100 enumerated documents per collection/locale. The production index has exactly 100 distinct owning paths per locale. Fuzzy matches for missing tokens are not counted as the owning page.' })
}
anomalies.push({ result: 'Production API and browser find numeric page 500 while page 75 is missing in both locales. The prebuilt index instead contains English sections 01/11 and German sections 01/10, with 100 owning pages per locale.', expected: 'The brief expects the first ~100 pages to be found; that is not numeric ranks 1–100. The prebuilt index and runtime/browser search should represent the same corpus.', explanation: 'The 100-page cap is confirmed. Source enumeration/query order is likely exposing different subsets, but the precise cause is unproved. An earlier pilot had sections 01/10 in both prebuilt locales. Do not infer a stable numeric cutoff or equivalence between the static index and SSR payload.' })
anomalies.push({ result: `Lighthouse mobile changed from 45 in the no-Markdown-opt-in pilot to ${production.lighthouse?.mobilePerformance ?? 'unavailable'} after the opt-in correction; first observed HTML body remained 334,822 bytes and client JS grew only 112 gzip bytes.`, expected: 'Adding server-side agent Markdown work should not itself produce a large client performance improvement. Compare with the earlier pilot.', explanation: 'The Lighthouse runner used the same heavily loaded Mac. Load changed sharply between runs, and Lighthouse/network/cold-start variability is uncontrolled. No performance improvement is inferred from this score difference.' })
const latencyFailures = [...localLatency.results.flatMap(row => row.batches.flatMap(batch => batch.samples)), ...production.latency.samples].filter(row => row.status !== 200 || !row.documentPresent)
if (latencyFailures.length) anomalies.push({ result: `${latencyFailures.length} latency requests returned errors or omitted the owning document.`, expected: 'A correct SSR measurement returns HTTP 200 and the requested token on all requests.', explanation: 'See raw request samples; failed requests are retained and cannot be interpreted as successful render latency.' })
if (escaping.measurements[2].ratioTo1x > 6) anomalies.push({ result: `C082 4x text took ${escaping.measurements[2].ratioTo1x.toFixed(2)}x the 1x time.`, expected: 'C082 claims linear escaping; similar repeated text should take about 4x time at 4x input.', explanation: 'This is an empirical observation on a loaded machine, not an asymptotic proof. Parse is excluded from the timer.' })
const assumptions = [
  'N means total documents across en and de; the unique token is unique within each locale and shared by translation pairs.',
  'Smaller corpora are exact page-content prefixes except for the final related-page link, which wraps to page 1 to keep the reduced fixture navigable.',
  'Build wall time includes generator and Corepack/pnpm startup. Each attempt removes .nuxt, .output, and .ginko first; artifact inspection after /usr/bin/time exits is outside the timer.',
  'Default agent means no content.agent override (static delivery default), with the docs collection explicitly opting into Markdown output; the second Node build changes only content.agent to false. HTML route rules ensure both builds render on each request.',
  'Measurements use a loaded Mac with other jobs and desktop apps active; load averages are recorded per build and request batch. Production browser checks overlap portions of the local build series; this is not an isolated benchmark.',
  'Production search API tests 10 distinct tokens in each locale (20 requests). Quantiles use the nearest-rank method and include the first request.',
  'No performance SLA is supplied for C297. Measurements and functional checks inform the reading; passing page checks do not certify a universal 2000-document limit.',
  'The brief overrides the repository convention of committing run JSON. /results/ was added to .git/info/exclude because the root !results/*.json rule otherwise kept scale JSON unignored.',
  'C082 measures the documented public serializer locally on pre-parsed equal-pattern inputs, three runs of 20 serializations per size, with round-trip validation; no private escape function is imported. This pure serializer result is retained across the demo agent-policy correction because it does not use app configuration or content.'
]
const report = { date: new Date().toISOString().slice(0, 10), demo: 'scale', package: { version: '1.0.0-beta.10', tarball: 'vendor/lupinum-ginko-content-1.0.0-beta.10-a3e8ef1.tgz' }, corpus: { documents: 2000, locales: { en: 1000, de: 1000 }, sectionsPerLocale: 20, pagesPerSection: 50, words: { min: 896, max: 1944 }, seed: '0x6a09e667 XOR rank' }, machine: builds.machine, builds: groups, buildRuns: builds.runs, searchCounts, localSearch, searchIndex, agentLatency: localLatency, escaping, production, anomalies, assumptions, issues: [...production.issues, 'Reliable production cold-start visibility unavailable; first observed request is retained.', 'C082 escaping ratios are local measurements; no hosted microbenchmark or asymptotic proof is claimed.'] }
const fmt = value => Number(value).toFixed(2)
const triple = (summary, scale = 1) => `${fmt(summary.median / scale)} [${fmt(summary.min / scale)}, ${fmt(summary.max / scale)}]`
const lines = [
  '# Scale measurement report', '',
  `Production: ${production.baseURL}. Package beta.10, vendor commit a3e8ef1. Corpus: 2,000 documents (1,000 per locale), 20 sections × 50 pages, 896–1,944 words per body. Generator seed is fixed.`, '',
  'Machine: Apple M1 Pro, 10 logical CPUs, 16 GiB RAM, Node 24.21.0. Other builds and desktop apps were active; initial load was 19.18/18.86/23.09 and about 10.6 GiB swap was in use later. Per-run load is in the JSON. These are loaded-machine observations.', '',
  '## Build growth', '', 'Three clean builds per N/mode; median [min, max]. Output sizes count file bytes, not disk allocation. macOS /usr/bin/time -l RSS is bytes and measures peak process RSS, not aggregate process-tree memory.', '',
  '| Mode | N total | Wall s | Peak RSS MiB | .output MiB | public/_nuxt KiB | Prerender routes / HTML files |', '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ...groups.map(row => `| ${row.mode} | ${row.n} | ${triple(row.wallSeconds)} | ${triple(row.peakRssBytes, 2 ** 20)} | ${triple(row.outputBytes, 2 ** 20)} | ${triple(row.nuxtBytes, 1024)} | ${row.prerenderedRoutes.join('/')} / ${row.prerenderedHtml.join('/')} |`), '',
  'Direct reruns (original runs above are never replaced):', '', '| Mode | N | Run | Wall s | Exit |', '| --- | ---: | --- | ---: | ---: |',
  ...builds.runs.filter(row => typeof row.repeat === 'number' && row.repeat > 3).map(row => `| ${row.mode} | ${row.n} | ${row.repeat} | ${fmt(row.wallSeconds)} | ${row.exitCode} |`), '',
  '## Search completeness', '', 'Each of the three local runs queries the documented useContentSearch composable. A hit counts only if it names the owning page; fuzzy hits on other pages do not count. Each locale has exactly 20 findings per run. Browser latency includes a fixed 350 ms observation wait and is not search-engine compute time.', '',
  '| Locale | Run 1 found / missing | Run 2 found / missing | Run 3 found / missing | Total per run |', '| --- | ---: | ---: | ---: | ---: |',
  ...['en', 'de'].map(locale => `| ${locale} | ${searchCounts.filter(row => row.locale === locale).map(row => `${row.found} / ${row.missing}`).join(' | ')} | 20 |`), '',
  '| Token | en found | de found |', '| --- | --- | --- |',
  ...localSearch[0].samples.map(row => `| ${row.token} | ${row.found ? 'yes' : 'no'} | ${localSearch.find(batch => batch.run === 1 && batch.locale === 'de').samples.find(item => item.rank === row.rank).found ? 'yes' : 'no'} |`), '',
  '## Agent on/off SSR latency', '', 'Same corpus, two local Node builds, one server at a time. Three batches of 50 full-body requests to five pages. Median [min,max] across batch quantiles; first request retained in every batch. No library tuning.', '',
  '| Agent | p50 ms | p95 ms | Requests |', '| --- | ---: | ---: | ---: |',
  ...localLatency.results.map(row => `| ${row.agent} | ${triple(row.p50)} | ${triple(row.p95)} | 150 |`), '',
  '## Production latency and budgets', '', '| Measurement | Result |', '| --- | ---: |',
  `| SSR requests / pages | 50 / 5 |`, `| p50 ms | ${fmt(production.latency.summary.p50)} |`, `| p95 ms | ${fmt(production.latency.summary.p95)} |`, `| First observed request ms | ${fmt(production.latency.firstRequest.milliseconds)} |`, `| Cold start | Not reliably visible |`, `| First docs-page client JS gzip bytes | ${production.clientJs?.gzipBytes ?? 'unavailable'} |`, `| Lighthouse mobile performance | ${production.lighthouse?.mobilePerformance ?? 'unavailable'} |`, '',
  'Search API latency includes the truncated default index, not a complete 2,000-document index. Fast timings here do not establish full-corpus search performance.', '',
  '| Token | en found / API ms | de found / API ms |', '| --- | --- | --- |',
  ...production.search.filter(row => row.locale === 'en').map(row => { const de = production.search.find(item => item.locale === 'de' && item.rank === row.rank); return `| ${row.token} | ${row.found ? 'yes' : 'no'} / ${fmt(row.milliseconds)} | ${de.found ? 'yes' : 'no'} / ${fmt(de.milliseconds)} |` }), '',
  '## C082 public serializer escaping', '', 'Pre-parsed equal-pattern strings; three runs of 20 serializations each. Round-trip equality checked at each size. Ratios are measurements, not proof of asymptotic complexity.', '',
  '| Input | Bytes | Serialization ms | Ratio to 1x |', '| --- | ---: | ---: | ---: |',
  ...escaping.measurements.map(row => `| ${row.multiplier}x | ${row.inputBytes} | ${triple(row.milliseconds)} | ${fmt(row.ratioTo1x)} |`), '',
  '## Reading', '',
  `The 2,000-document corpus builds and serves through the unchanged beta.10 filesystem provider, but “reasonable” has no stated SLA. The full build, memory, output-size and SSR costs above are the evidence for deciding whether this fits a specific site; the loaded Mac limits conclusions about scaling. Search completeness breaks first: only ${searchCounts[0].found}/20 sampled English tokens and ${searchCounts[1].found}/20 German tokens are found. The production prebuilt index covers only 100 of 1,000 owning pages per locale; its subset also differs from the runtime/browser results, so the cap is not a stable numeric-rank cutoff. Default fuzzy results can obscure the omission. The agent comparison measures the default middleware's request cost, and runtime search API timings include request-time index construction (E-A015, confirmed by reading the installed endpoint); neither is tuned here.`, '',
  '## Anomalies', '', ...anomalies.map(row => `- ${row.result} Expected: ${row.expected} Explanation: ${row.explanation}`), '',
  '## Assumptions and limits', '', ...assumptions.map(row => `- ${row}`), ...report.issues.map(row => `- ${row}`), '',
  '## Evidence', '', '- results/evidence/scale/builds.json and *.log/*.time', '- results/evidence/scale/local-latency.json, local-search.json, escaping.json', '- results/evidence/scale/production.json, production-claims.json, production-check.log, lighthouse.json, client-js.json', '- results/evidence/scale-playwright/ (desktop/mobile screenshots and failure traces)', '- results/evidence/scale/vercel-*.json and vercel-*.log', '',
  'Pilot failures remain in results/evidence/scale-pilot-no-agent/. An initial overlapping generator invocation, an overly broad app-owned route rule, and a missing collection Markdown opt-in were corrected before the final recorded series; none is a library finding. The incomplete first static 1,000-document pilot was terminated rather than mixed with the corrected configuration.'
]
await writeFile(new URL(`results/${report.date}-scale.json`, root), JSON.stringify(report, null, 2) + '\n')
await writeFile(new URL('results/scale-report.md', root), lines.join('\n') + '\n')
console.log(JSON.stringify({ report: `results/${report.date}-scale.json`, readable: 'results/scale-report.md', anomalies: anomalies.length, searchCounts }, null, 2))
