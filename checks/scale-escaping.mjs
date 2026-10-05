import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { distribution } from './scale-common.mjs'
import { loadavg } from 'node:os'
const require = createRequire(new URL('../apps/scale/package.json', import.meta.url))
const { parseMdcDocument, serializeMdcDocument, projectMdcDocument } = await import(require.resolve('@lupinum/ginko-content/cms-contract'))
const pattern = String.raw`Literal \:fire \:\:card a\{.b\} \#slot https\://a.com README\.md a\@b.com. `
const measurements = []
for (const multiplier of [1, 2, 4]) {
  const source = pattern.repeat(1000 * multiplier)
  const document = await parseMdcDocument(source, { autoClose: false })
  const output = await serializeMdcDocument(document)
  assert.deepEqual(projectMdcDocument(await parseMdcDocument(output, { autoClose: false })).body, projectMdcDocument(document).body)
  for (let i = 0; i < 5; i++) await serializeMdcDocument(document)
  const runs = []
  const startLoad = loadavg()
  for (let run = 0; run < 3; run++) {
    const start = performance.now()
    for (let iteration = 0; iteration < 20; iteration++) await serializeMdcDocument(document)
    runs.push((performance.now() - start) / 20)
  }
  measurements.push({ multiplier, inputBytes: Buffer.byteLength(source), outputBytes: Buffer.byteLength(output), milliseconds: distribution(runs), runs, startLoad, endLoad: loadavg() })
}
const baseline = measurements[0].milliseconds.median
const result = { claim: 'C082', status: 'pass', scope: 'Public serializeMdcDocument on pre-parsed equal-pattern text; empirical ratios, no asymptotic proof or promised threshold. Parse is outside the timer; round-trip verified at every size.', pattern, measurements: measurements.map(row => ({ ...row, ratioTo1x: row.milliseconds.median / baseline })) }
await writeFile(new URL('../results/evidence/scale/escaping.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
