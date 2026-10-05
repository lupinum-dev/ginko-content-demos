import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const app = resolve(root, 'apps/multilingual')
const evidence = resolve(root, 'results/evidence')
mkdirSync(evidence, { recursive: true })
const results = []
for (const fixture of ['standalone', 'unicode']) {
  const run = spawnSync('corepack', ['pnpm', 'exec', 'nuxt', 'generate', `fixtures/${fixture}`], { cwd: app, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 })
  const output = `${run.stdout}\n${run.stderr}`
  writeFileSync(resolve(evidence, `multilingual-${fixture}-build.log`), output)
  if (fixture === 'unicode') results.push({ check: 'K002 E-A013 Unicode filenames keep a distinct public route', status: run.status === 0 ? 'needs-inspection' : 'fail', exitCode: run.status, evidence: `results/evidence/multilingual-${fixture}-build.log`, docs: 'docs/content/docs/4.guides/7.translated-slugs.md:Translate folder and file names', error: output.match(/[^\n]*(?:collision|Duplicate|duplicate|collid)[^\n]*/g) })
  else {
    const routes = [['docs/intro', 'Standalone English'], ['de/docs/intro', 'Standalone Deutsch'], ['plain', 'Unlocalized'], ['local/intro', 'Local English'], ['ja/local/intro', 'ローカル']]
    const observations = routes.map(([path, text]) => {
      try { return { path, text, matched: readFileSync(resolve(app, `fixtures/standalone/.output/public/${path}/index.html`), 'utf8').includes(text) } }
      catch (error) { return { path, matched: false, error: error.message } }
    })
    const xml = readFileSync(resolve(app, 'fixtures/standalone/.output/public/sitemap.xml'), 'utf8')
    const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? []
    const singleton = entries.filter(entry => entry.includes('/docs/single</loc>'))
    writeFileSync(resolve(evidence, 'multilingual-standalone-sitemap.xml'), xml)
    results.push({ check: 'K003 E-X1 singleton without fallback keeps hreflang and x-default', status: singleton.some(entry => entry.includes('hreflang="en"') && entry.includes('hreflang="x-default"')) ? 'pass' : 'fail', observed: singleton, docs: 'docs/content/docs/4.guides/9.sitemap-and-prerender.md:Control which pages appear; reasonable indexing expectation E-X1', evidence: 'results/evidence/multilingual-standalone-sitemap.xml', productionVerified: false })
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1])
    results.push({ check: 'Standalone sitemap uniqueness observation', urls: locs.length, uniqueUrls: new Set(locs).size, productionVerified: false })
    results.push({ check: 'C161 C163 independent content-owned locale and collection policies; shared-slug mode', status: run.status === 0 && observations.every(x => x.matched) ? 'pass' : 'fail', exitCode: run.status, observations, evidence: 'results/evidence/multilingual-standalone-build.log', productionVerified: false })
  }
}
const pagefind = resolve(app, '.output/public/pagefind')
function digest(dir) {
  return createHash('sha256').update(readdirSync(dir, { recursive: true, withFileTypes: true }).filter(x => x.isFile()).map(x => { const path = resolve(x.parentPath, x.name); return `${path}:${createHash('sha256').update(readFileSync(path)).digest('hex')}` }).sort().join('\n')).digest('hex')
}
const before = digest(pagefind)
const late = resolve(app, 'content/en/1.docs/99.after-build.md')
try {
  writeFileSync(late, '---\ntitle: UnbuiltSentinelZebra\ndescription: Snapshot probe.\n---\n\n# UnbuiltSentinelZebra\n')
  const after = digest(pagefind)
  results.push({ check: 'C181 post-generation source change leaves Pagefind snapshot unchanged', status: before === after ? 'pass' : 'fail', before, after, productionVerified: false })
} finally { unlinkSync(late) }
writeFileSync(resolve(evidence, 'multilingual-local.json'), JSON.stringify(results, null, 2)+'\n')
writeFileSync(resolve(root, `results/${new Date().toISOString().slice(0, 10)}-multilingual-local.json`), JSON.stringify(results, null, 2)+'\n')
console.log(JSON.stringify(results, null, 2))
process.exitCode = results.some(x => x.status && x.status !== 'pass') ? 1 : 0
