import { readFile, writeFile, readdir, access } from 'node:fs/promises'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const configPath = resolve(root, 'ginko-source.json')
const config = JSON.parse(await readFile(configPath, 'utf8'))
const argument = process.argv[2]
if (process.argv.length > 3) throw new Error('Usage: pnpm use-ginko <path-to-tgz | npm-version>')
const source = argument ?? config.source
const tarball = source.endsWith('.tgz')
const absolute = tarball ? resolve(argument ? process.cwd() : root, source) : undefined
if (tarball) {
  await access(absolute)
  if (relative(root, absolute).startsWith('..')) throw new Error('Copy the tarball into vendor/ first so GitHub and Vercel can install it.')
} else if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(source)) {
  throw new Error('Provide an exact npm version or a repository-local .tgz path.')
}
const manifests = []
const directories = ['apps', 'fixtures/known-failures']
for (const directory of directories) {
  for (const app of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (!app.isDirectory()) continue
    const path = resolve(root, directory, app.name, 'package.json')
    const manifest = JSON.parse(await readFile(path, 'utf8'))
    const sections = ['dependencies', 'devDependencies', 'optionalDependencies'].filter(section => manifest[section]?.['@lupinum/ginko-content'])
    if (sections.length !== 1) throw new Error(`${app.name} must declare exactly one Ginko dependency`)
    manifest[sections[0]]['@lupinum/ginko-content'] = tarball ? `file:${relative(dirname(path), absolute).split('\\').join('/')}` : source
    manifests.push([path, manifest])
  }
}
await writeFile(configPath, JSON.stringify({ source: tarball ? relative(root, absolute).split('\\').join('/') : source }, null, 2) + '\n')
for (const [path, manifest] of manifests) await writeFile(path, JSON.stringify(manifest, null, 2) + '\n')
const result = spawnSync('corepack', ['pnpm', 'install', '--no-frozen-lockfile'], { cwd: root, stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
