import { mkdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import map from './claims-map.json' with { type: 'json' }
import targets from './targets.json' with { type: 'json' }
import claims from './claims-source.json' with { type: 'json' }
import expectations from './expectations.json' with { type: 'json' }
const root = fileURLToPath(new URL('../', import.meta.url))
export default class ClaimReporter {
  records = []
  onTestEnd(test, result) {
    const claims = test.title.match(/[CX]\d{3}/g) ?? []
    for (const claim of claims) this.records.push({ claim, observedStatus: result.status, infrastructureIssue: process.env.PRODUCTION_UNAVAILABLE || undefined, status: process.env.PRODUCTION_UNAVAILABLE ? 'blocked' : result.status === 'passed' ? 'pass' : ['skipped', 'interrupted'].includes(result.status) ? 'blocked' : 'fail', check: test.title, viewport: test.parent.project()?.name, evidence: result.attachments.map(attachment => ({ name: attachment.name, path: attachment.path ? relative(root, attachment.path) : undefined, text: attachment.body?.toString() })), errors: result.errors.map(error => error.message) })
  }
  onEnd() {
    const demo = process.env.DEMO ?? 'quickstart'
    const url = process.env.BASE_URL ?? targets[demo].BASE_URL
    const results = [...map.filter(entry => entry.demo === demo), ...expectations.filter(entry => entry.demos.includes(demo))].map(entry => {
      const checks = this.records.filter(record => record.claim === entry.id)
      return { claim: entry.id, sources: claims.find(claim => claim.id === entry.id)?.sources ?? ['checks/expectations.json'], rationale: entry.rationale, status: checks.some(check => check.status === 'fail') ? 'fail' : !checks.length || checks.some(check => check.status === 'blocked') ? 'blocked' : 'pass', url, evidence: checks }
    })
    mkdirSync(resolve(root, 'results'), { recursive: true })
    writeFileSync(process.env.RESULTS_PATH ?? resolve(root, 'results', `${new Date().toISOString().slice(0, 10)}-${demo}.json`), JSON.stringify(results, null, 2) + '\n')
  }
}
