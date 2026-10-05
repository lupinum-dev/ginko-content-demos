import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
export const extraChecks = [
  { id:'X301', rationale:'Public request headers must not expose unpublished catalog content.' },
  { id:'X302', rationale:'Header-only caches must reject unsigned revalidation and return 501 for valid signed requests.' },
  { id:'X303', rationale:'The documented Node export should load the unchanged Nuxt docs-site and round-trip its portable directory.' },
  { id:'K301', sources:['docs/content/docs/5.reference/2.content-config.md:103'], rationale:'D-02: required data title/description must remain in the resolved CMS contract.' },
  { id:'K302', sources:['docs/content/docs/6.migration/5.filesystem-to-cms.md'], rationale:'D-03: an unlocalized default filesystem site must not fail locale contract validation.' },
  { id:'K303', sources:['docs/content/docs/6.migration/5.filesystem-to-cms.md:82'], rationale:'The programmatic exporter must load a normal defineNuxtConfig configuration.' },
  { id:'K304', sources:['docs/content/docs/4.guides/13.data-source-adapters.md:238','docs/content/docs/5.reference/10.provider-contract.md:137'], rationale:'A binder claiming fixed-shape result validation should reject a mismatched paging envelope; the separate conformance kit does reject it.' }
]
export function buildRecords(root) {
  const records = []
  for (const [file, mode] of [['scripts.json','build-only'],['conformance.json','conformance']]) {
    const path = `results/evidence/custom-source/${file}`
    let report
    try { report = JSON.parse(readFileSync(resolve(root,path),'utf8')) }
    catch (error) { records.push({ claim:'X303', status:'blocked', check:`Missing ${file}`, mode, errors:[error.message], evidence:[] }); continue }
    const checks = file === 'scripts.json' ? report : report.testResults.flatMap(suite => suite.assertionResults.map(t => ({ check:t.fullName, ids:t.fullName.match(/[CXK]\d{3}/g) ?? [], status:t.status === 'passed' ? 'pass' : t.status === 'failed' ? 'fail' : 'blocked', errors:t.failureMessages })))
    for (const check of checks) for (const claim of check.ids) records.push({ claim, status:check.status, check:check.check, mode, errors:check.errors, evidence:[{ name:file, path }] })
  }
  return records
}
