import { readFile } from 'node:fs/promises'
const source = JSON.parse(await readFile(process.argv[2] ?? new URL('../checks/claims-source.json', import.meta.url), 'utf8'))
const map = JSON.parse(await readFile(new URL('../checks/claims-map.json', import.meta.url), 'utf8'))
const ids = new Set(source.map(claim => claim.id))
const mapped = new Set(map.map(claim => claim.id))
const demos = new Set(['quickstart', 'docs-site', 'blog', 'multilingual', 'custom-source', 'scale', 'not-live'])
if (source.length !== 365 || ids.size !== 365 || map.length !== 365 || mapped.size !== 365 || [...ids].some(id => !mapped.has(id))) throw new Error('Claim ids differ, duplicate, or count is not 365')
for (const entry of map) {
  if (!demos.has(entry.demo) || !(entry.demo === 'not-live' ? entry.reason : entry.check)) throw new Error(`Invalid mapping: ${entry.id}`)
}
const counts = Object.fromEntries([...demos].map(demo => [demo, map.filter(entry => entry.demo === demo).length]))
console.log(JSON.stringify({ count: map.length, duplicates: map.length - mapped.size, exactIds: true, counts }, null, 2))
