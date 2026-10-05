import { readFile, writeFile } from 'node:fs/promises'
import { pathFor } from './scale-common.mjs'

const evidence = new URL('../results/evidence/scale/', import.meta.url)
const read = async name => JSON.parse(await readFile(new URL(name, evidence), 'utf8'))
const claims = await read('production-claims.json')
let index
try { index = await read('production-search-index.json') }
catch (error) {
  if (error.code !== 'ENOENT') throw error
  const production = await read('production.json')
  const response = await fetch(new URL('/api/_content/search/index.json', production.baseURL))
  if (!response.ok) throw new Error(`Generated search index: HTTP ${response.status}`)
  index = await response.json()
  await writeFile(new URL('production-search-index.json', evidence), JSON.stringify(index) + '\n')
}
const findings = claims.find(row => row.claim === 'X401').evidence
  .filter(row => row.viewport === 'desktop')
  .flatMap(row => JSON.parse(row.evidence.find(item => item.name === 'completeness.json').text))
  .map(row => ({ ...row, expectedPage: pathFor(row.rank, row.locale), topHit: row.returnedPaths[0] ?? null }))
for (const locale of ['en', 'de']) {
  const rows = findings.filter(row => row.locale === locale)
  if (rows.length !== 20 || rows.some(row => row.found !== row.returnedPaths.includes(row.expectedPage))) throw new Error(`Invalid completeness evidence for ${locale}`)
}
const diagnosis = ['en', 'de'].map(locale => {
  const hit = findings.find(row => row.locale === locale && row.rank === 101)
  const records = index.filter(row => row.locale === locale)
  return {
    locale, token: hit.token, expectedPage: hit.expectedPage, topHit: hit.topHit,
    exactTokenRecords: records.filter(row => /\bzq0101\b/.test(JSON.stringify(row))).map(row => row.id),
    owningPageRecords: records.filter(row => row.path === hit.expectedPage).map(row => row.id),
    topPageTokenRecords: records.filter(row => row.path === hit.topHit && /\bzq\d{4}\b/.test(row.content)).map(row => ({ id: row.id, content: row.content })),
    distinctOwningPages: new Set(records.map(row => row.path)).size
  }
})
const result = { source: 'Saved production desktop useContentSearch findings and generated public /api/_content/search/index.json; saved asset is reused when present.', findings, diagnosis }
await writeFile(new URL('search-wrong-hit-index.json', evidence), JSON.stringify(result, null, 2) + '\n')
const locales = Object.fromEntries(['en', 'de'].map(locale => {
  const paths = [...new Set(index.filter(row => row.locale === locale).map(row => row.path))].sort()
  return [locale, { uniquePages: paths.length, sections: [...new Set(paths.map(path => path.match(/section-\d+/)?.[0]))].sort(), paths }]
}))
await writeFile(new URL('search-index-summary.json', evidence), JSON.stringify({ records: index.length, locales }, null, 2) + '\n')
console.log(JSON.stringify({ records: index.length, diagnosis }, null, 2))
