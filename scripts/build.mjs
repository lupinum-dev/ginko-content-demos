import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const start = performance.now()
const result = spawnSync('corepack', ['pnpm', '--filter', './apps/*', 'build'], { cwd: root, stdio: 'inherit' })
mkdirSync(`${root}/results/evidence`, { recursive: true })
writeFileSync(`${root}/results/evidence/build.json`, JSON.stringify({ seconds: (performance.now() - start) / 1000, exitCode: result.status, node: process.version }, null, 2) + '\n')
if (result.error) throw result.error
process.exitCode = result.status ?? 1
