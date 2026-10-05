import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const demo = process.argv[2]
if (demo && (!/^[a-z-]+$/.test(demo) || !existsSync(`${root}/apps/${demo}/package.json`))) throw new Error(`Unknown demo: ${demo}`)
mkdirSync(`${root}/results/evidence`, { recursive: true })
for (const name of demo ? [demo] : readdirSync(`${root}/apps`).filter(name => existsSync(`${root}/apps/${name}/package.json`))) {
  const start = performance.now()
  const result = spawnSync('corepack', ['pnpm', '--filter', `@ginko-demo/${name}`, 'build'], { cwd: root, stdio: 'inherit' })
  writeFileSync(`${root}/results/evidence/build-${name}.json`, JSON.stringify({ demo: name, seconds: (performance.now() - start) / 1000, exitCode: result.status, node: process.version }, null, 2) + '\n')
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
