import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const fixtures = [
  { id: 'K001', app: 'k001-relative-links', claims: ['C198', 'X002'], audit: 'E-A004', errors: ['Public Markdown AST is not render-safe.', '[404] Page not found: /other/y'], sources: ['checks/expectations.json', 'docs/content/docs/7.resources/2.deployment.md:21'] },
  { id: 'K002', app: 'k002-security-boolean', claims: ['C057', 'C062'], errors: ['Required component property "enabled" is missing.'], sources: ['docs/content/docs/5.reference/3.module-options.md:91', 'docs/content/docs/4.guides/2.mdc-components.md:85'] }
]
mkdirSync(`${root}/results/evidence`, { recursive: true })
const results = fixtures.map(fixture => {
  const start = performance.now()
  const build = spawnSync('corepack', ['pnpm', '--filter', `@ginko-fixture/${fixture.app}`, 'build'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  const output = `${build.stdout ?? ''}\n${build.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '')
  const log = `results/evidence/${fixture.id}-build.log`
  writeFileSync(`${root}/${log}`, output)
  const matchedErrors = fixture.errors.filter(error => output.includes(error))
  const unexpectedFailure = build.status !== 0 && matchedErrors.length !== fixture.errors.length
  const result = { ...fixture, status: build.status === 0 ? 'pass' : unexpectedFailure ? 'blocked' : 'fail', exitCode: build.status, buildSeconds: (performance.now() - start) / 1000, matchedErrors, evidence: [log], issue: unexpectedFailure ? `Build failed without all expected diagnostics: ${fixture.errors.filter(error => !matchedErrors.includes(error)).join('; ')}` : undefined }
  console.log(JSON.stringify(result, null, 2))
  return result
})
writeFileSync(`${root}/results/${new Date().toISOString().slice(0, 10)}-known-failures.json`, JSON.stringify(results, null, 2) + '\n')
process.exitCode = results.every(result => result.status === 'pass') ? 0 : 1
