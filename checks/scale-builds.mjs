import { spawn, execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { loadavg, freemem, totalmem, cpus } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const app = `${root}/apps/scale`
const evidence = `${root}/results/evidence/scale`
await mkdir(evidence, { recursive: true })
const reruns = process.env.SCALE_RERUNS?.split(',').map(value => {
  const [mode, count] = value.split(':')
  const n = Number(count)
  if (!['ssr', 'static'].includes(mode) || ![200, 1000, 2000].includes(n)) throw new Error('SCALE_RERUNS must contain mode:N pairs, e.g. ssr:200,ssr:1000')
  return { mode, n }
})
const runs = reruns ? JSON.parse(await readFile(`${evidence}/builds.json`, 'utf8')).runs : []
async function files(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return (await Promise.all(entries.map(async entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [{ path: `${directory}/${entry.name}`, bytes: (await stat(`${directory}/${entry.name}`)).size }]))).flat()
  } catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
async function run(n, mode, repeat, agent = 'default') {
  const name = `${mode}-${n}-${agent}-${repeat}`
  for (const directory of ['.nuxt', '.output', '.ginko']) await rm(`${app}/${directory}`, { recursive: true, force: true })
  const environment = { load: loadavg(), freeMemory: freemem(), time: new Date().toISOString() }
  const log = createWriteStream(`${evidence}/${name}.log`)
  const start = performance.now()
  const code = await new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/time', ['-l', '-o', `${evidence}/${name}.time`, 'corepack', 'pnpm', mode === 'static' ? 'generate' : 'build'], { cwd: app, env: { ...process.env, SCALE_DOCUMENTS: String(n), SCALE_AGENT: agent === 'off' ? 'off' : '' } })
    child.stdout.pipe(log); child.stderr.pipe(log)
    child.on('error', reject); child.on('close', resolve)
  })
  log.end()
  const timing = await readFile(`${evidence}/${name}.time`, 'utf8')
  const output = await files(`${app}/.output`)
  const buildLog = await readFile(`${evidence}/${name}.log`, 'utf8')
  const result = { n, mode, repeat, agent, exitCode: code, wallSeconds: Number(timing.match(/([\d.]+)\s+real/)?.[1] ?? ((performance.now() - start) / 1000)), peakRssBytes: Number(timing.match(/(\d+)\s+maximum resident set size/)?.[1]) || null, outputBytes: output.reduce((sum, file) => sum + file.bytes, 0), nuxtBytes: output.filter(file => file.path.includes('/public/_nuxt/')).reduce((sum, file) => sum + file.bytes, 0), prerenderedRoutes: Number(buildLog.match(/Prerendered (\d+) routes/)?.[1] ?? 0), prerenderedHtml: output.filter(file => file.path.includes('/public/') && file.path.endsWith('.html')).length, environment, endLoad: loadavg(), evidence: [`results/evidence/scale/${name}.log`, `results/evidence/scale/${name}.time`] }
  runs.push(result)
  await writeFile(`${evidence}/builds.json`, JSON.stringify({ machine: { cpu: cpus()[0].model, cpus: cpus().length, memory: totalmem(), node: process.version, timeMethod: '/usr/bin/time -l; macOS maximum resident set size is bytes; peak is maximum process RSS, not aggregate process tree memory' }, runs }, null, 2) + '\n')
  console.log(JSON.stringify(result))
  return result
}
const modes = process.env.SCALE_MODES?.split(',') ?? ['ssr', 'static']
if (reruns) {
  for (const { mode, n } of reruns) await run(n, mode, Math.max(3, ...runs.filter(row => row.mode === mode && row.n === n && typeof row.repeat === 'number').map(row => row.repeat)) + 1)
  process.exit(runs.some(run => run.exitCode !== 0) ? 1 : 0)
}
for (const mode of modes) for (const n of [200, 1000, 2000]) for (let repeat = 1; repeat <= 3; repeat++) await run(n, mode, repeat)
// Preserve a direct rerun of an inverted pair, rather than deleting noisy samples.
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
for (const mode of modes) for (const [small, large] of [[200, 1000], [1000, 2000]]) {
  const pairedReversal = [1, 2, 3].some(repeat => runs.find(r => r.mode === mode && r.n === large && r.repeat === repeat).wallSeconds < runs.find(r => r.mode === mode && r.n === small && r.repeat === repeat).wallSeconds)
  const crossRunReversal = Math.min(...runs.filter(r => r.mode === mode && r.n === large).map(r => r.wallSeconds)) < Math.max(...runs.filter(r => r.mode === mode && r.n === small).map(r => r.wallSeconds))
  if (pairedReversal || crossRunReversal || median(runs.filter(r => r.mode === mode && r.n === large).map(r => r.wallSeconds)) < median(runs.filter(r => r.mode === mode && r.n === small).map(r => r.wallSeconds))) {
    await run(small, mode, 4); await run(large, mode, 4)
  }
}
if (process.env.SCALE_MODES === undefined) {
  await run(2000, 'ssr', 'agent-off', 'off')
  // Save two identical-corpus Node builds for the middleware A/B requests.
  await rm(`${evidence}/node-agent-off`, { recursive: true, force: true })
  execFileSync('cp', ['-R', `${app}/.output`, `${evidence}/node-agent-off`])
  await run(2000, 'ssr', 'agent-default')
  await rm(`${evidence}/node-agent-default`, { recursive: true, force: true })
  execFileSync('cp', ['-R', `${app}/.output`, `${evidence}/node-agent-default`])
}
process.exitCode = runs.some(run => run.exitCode !== 0) ? 1 : 0
