import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

import routes from '../docs-site-routes.json' with { type: 'json' }
async function open(page, path, testInfo) {
  const response = await page.goto(path)
  const html = await response.text()
  const evidence = testInfo.outputPath('response.html')
  await writeFile(evidence, html)
  await testInfo.attach('Page HTTP response', { path: evidence, contentType: 'text/html' })
  expect(response.status(), html.slice(0,1000)).toBe(200)
  await page.waitForLoadState('networkidle')
}

test('C040 C358 Markdown structures render before and after hydration', async ({ page }, info) => {
  await open(page, '/docs/guides/markdown', info)
  const doc = page.getByTestId('document')
  await expect(doc.locator('h1')).toHaveText('Markdown')
  await expect(doc.locator('strong').first()).toHaveText('strong')
  await expect(doc.locator('ul').first()).toContainText('Record a place')
  await expect(doc.locator('ol')).toContainText('Open the notebook')
  await expect(doc.locator('blockquote').first()).toContainText('Keep observations short')
  await expect(doc.locator('table')).toContainText('Notebook')
  await expect(doc.locator('th').last()).toHaveAttribute('style', /text-align:\s*right/)
  await expect(doc.locator('input[type=checkbox]').first()).toBeChecked()
  await expect(doc.locator('pre')).toContainText('const observation')
  const html = await (await page.request.get('/docs/guides/markdown')).text()
  expect(html).toContain('Keep observations short')
  expect(html).toContain('<table')
  expect(html).toContain('type="checkbox"')
})

test('C045 Markdown tag mapping renders application prose component', async ({ page }, info) => {
  await open(page, '/docs/start', info)
  await expect(page.getByTestId('document').getByTestId('mapped-paragraph')).toContainText('Keep a short record')
})

test('C046 heading anchors obey configured depth and exclusions', async ({ page }, info) => {
  await open(page, '/docs/guides/headings', info)
  const doc = page.getByTestId('document')
  await expect(doc.locator('h1 a')).toHaveCount(0)
  await expect(doc.locator('h2').first().locator('a')).toHaveAttribute('href', '#_1-setup')
  await expect(doc.locator('h3').first().locator('a')).toHaveAttribute('href', '#_1-setup-details')
  await expect(doc.locator('h4 a, h5 a')).toHaveCount(0)
})

test('C049 breaks plugin preserves the authored soft line break', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  await expect(page.getByTestId('document').locator('p').filter({hasText:'Line one'}).locator('br')).toHaveCount(1)
})

test('C050 emoji plugin renders the authored shortcode', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  await expect(page.getByTestId('document')).toContainText('😄')
})

test('C051 footnotes plugin renders the note and its visitor jump link', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  await expect(page.getByTestId('document')).toContainText('Keep a backup copy')
  await page.getByTestId('document').locator('sup a').click()
  await expect(page).toHaveURL(/#fn-tip$/)
  await expect(page.locator('[id="fn-tip"]')).toHaveCount(1)
})

test('C052 Shiki highlights fenced code in server and hydrated output', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  await expect(page.getByTestId('document').locator('pre code span').first()).toBeVisible()
  const html = await (await page.request.get('/docs/guides/plugins')).text()
  expect(html).toContain('shiki')
})

test('C054 C337 math renders on the server with the explicitly included KaTeX CSS', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  const math = page.getByTestId('document').locator('.katex').first()
  await expect(math).toBeVisible()
  expect(await math.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('KaTeX')
  expect(await (await page.request.get('/docs/guides/plugins')).text()).toContain('katex')
})

test('C055 Mermaid renders a diagram in the browser', async ({ page }, info) => {
  await open(page, '/docs/guides/diagrams', info)
  await expect(page.getByTestId('document').locator('svg').first()).toBeVisible()
  await expect(page.getByTestId('document')).toContainText('Review')
})

test('C056 punctuation converts straight quotes and ellipsis', async ({ page }, info) => {
  await open(page, '/docs/guides/plugins', info)
  await expect(page.getByTestId('document')).toContainText('“quoted” … text')
})

test('C058 C064 excerpt renders only the boundary prefix', async ({ page }, info) => {
  await open(page, '/inspect', info)
  await expect(page.getByTestId('excerpt')).toContainText('Keep a short record')
  await expect(page.getByTestId('excerpt')).not.toContainText('AFTER_EXCERPT_BOUNDARY')
  await expect(page.getByTestId('wrapper')).toContainText('AFTER_EXCERPT_BOUNDARY')
})

test('C060 C061 C062 block inline angle nested components slots and JSON props render', async ({ page }, info) => {
  await open(page, '/docs/guides/components', info)
  const doc = page.getByTestId('document')
  await expect(doc.getByTestId('callout')).toHaveCount(3)
  await expect(doc.getByTestId('callout').first()).toHaveAttribute('data-tone','warning')
  await expect(doc.getByTestId('callout').first().getByTestId('callout')).toContainText('Nested advice')
  await expect(doc.getByTestId('actions')).toHaveCount(2)
  await expect(doc.getByTestId('actions').last()).toContainText('Open installation')
  await expect(doc.getByTestId('badge')).toHaveCount(2)
  await expect(doc.getByTestId('metrics')).toHaveAttribute('data-count','3')
  await expect(doc.getByTestId('metrics')).toHaveAttribute('data-enabled','false')
  await expect(doc.getByTestId('metrics')).toHaveAttribute('data-mode','safe')
})

test('C065 C066 renderer wrapper unwrap and inherited attributes have one target', async ({ page }, info) => {
  await open(page, '/inspect', info)
  await expect(page.locator('section#custom-wrapper.wrapper-example[data-testid=wrapper]')).toHaveCount(1)
  await expect(page.getByTestId('unwrap').locator('p')).toHaveCount(0)
  await expect(page.getByTestId('unwrap').locator('strong')).toHaveText('text')
})

test('C067 C353 inline Markdown renders an override and reacts to editing without a reload', async ({ page }, info) => {
  await open(page, '/inspect', info)
  await expect(page.getByTestId('inline-strong')).toHaveText('release notes')
  await expect(page.getByTestId('inline')).toContainText('Read')
  const html = await (await page.request.get('/inspect')).text()
  expect(html).toContain('<mark data-testid="inline-strong">release notes</mark>')
  await page.evaluate(() => { window.__demoNavigationMarker = 'same-document' })
  await page.getByTestId('edit-inline').click()
  await expect(page.getByTestId('inline')).toContainText('Updated')
  expect(await page.evaluate(() => window.__demoNavigationMarker)).toBe('same-document')
})

test('C068 explicit normalized body and policy render using the exported body renderer', async ({ page }, info) => {
  await open(page, '/inspect', info)
  await expect(page.getByTestId('body-preview').locator('h2')).toHaveText('Preview')
  await expect(page.getByTestId('body-preview').locator('strong')).toHaveText('formatted text')
})

test('C075 C059 C081 C302 TOC destinations match nested repeated headings and exclude fences', async ({ page }, info) => {
  await open(page, '/docs/guides/headings', info)
  const links = await page.getByTestId('toc').locator('a').evaluateAll(as => as.map(a => ({href:a.getAttribute('href'),text:a.textContent})))
  expect(links.length).toBeGreaterThan(2)
  expect(links.map(x=>x.text)).not.toContain('Not in the TOC')
  for (const link of links) {
    if (link.href === '#') continue // Non-ASCII-only heading limitation is asserted separately.
    expect(await page.getByTestId('document').locator(`[id="${link.href.slice(1)}"]`).count()).toBe(1)
  }
  await page.getByTestId('toc').getByRole('link',{name:'Details',exact:true}).first().click()
  await expect(page).toHaveURL(/#_1-setup-details$/)
  await page.goto('/inspect')
  const toc = JSON.parse(await page.getByTestId('extracted-toc').innerText())
  expect(toc.title).toBe('Extracted contents')
  expect(toc.links.map(x=>x.id)).toEqual(['intro','intro-details','intro-1'])
  expect(JSON.stringify(toc)).not.toContain('Code heading')
  for(const id of ['intro','intro-details','intro-1']) await expect(page.getByTestId('toc-preview').locator(`[id="${id}"]`)).toHaveCount(1)
})

test('C349 non-ASCII headings require explicit anchors and repeat deterministically', async ({ page }, info) => {
  await open(page, '/docs/guides/headings', info)
  const ids = await page.getByTestId('document').locator('h2').filter({hasText:'日本語'}).evaluateAll(hs=>hs.map(h=>h.id))
  expect(ids).toEqual(['','-1','japanese'])
})

test('C105 surround returns first middle and last neighbors and visitor links follow them', async ({ page }, info) => {
  await open(page, '/inspect', info)
  const neighbors = JSON.parse(await page.getByTestId('neighbors').innerText())
  expect(neighbors[0].previous).toBeNull()
  expect(neighbors[0].next.path).toBe('/docs/start/installation')
  expect(neighbors[1].previous.path).toBe('/docs/start')
  expect(neighbors[1].next.path).toBe('/docs/start/first-note')
  expect(neighbors[2].previous.path).toBe(process.env.CHECK_ENV === 'development' ? '/docs/reference/draft' : '/docs/reference/group/storage')
  expect(neighbors[2].next).toBeNull()
  await page.goto('/docs/start')
  await expect(page.getByTestId('previous')).toHaveCount(0)
  await page.getByTestId('next').click()
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Installation')
})

test('C106 navigation applies filtering sorting and projection without losing structural groups', async ({ page }, info) => {
  await open(page, '/inspect', info)
  const tree = page.getByTestId('filtered-navigation')
  await expect(tree.getByRole('link')).toHaveText(['Start here','Updates','Sharing','First Note','Install'])
  await expect(tree).not.toContainText('Guides')
  await expect(tree.getByRole('link').first()).toHaveAttribute('href','/docs/start')
})

test('C139 C140 C141 C142 sidebar labels folder metadata numeric order and pathless groups', async ({ page }, info) => {
  await open(page, '/docs/start', info)
  const sidebar = page.getByTestId('sidebar')
  await expect(sidebar.getByRole('link',{name:'Install',exact:true})).toHaveAttribute('href','/docs/start/installation')
  await expect(sidebar.locator('li[data-sidebar=section]').first()).toHaveAttribute('data-icon','i-lucide-book')
  await expect(sidebar.getByTestId('structural-group')).toHaveText('Advanced group')
  await expect(sidebar.getByRole('link',{name:'Advanced group',exact:true})).toHaveCount(0)
  const paths = await sidebar.getByRole('link').evaluateAll(as=>as.map(a=>a.getAttribute('href')))
  expect(paths.indexOf('/docs/start/installation')).toBeLessThan(paths.indexOf('/docs/start/updates'))
  expect(paths.every(p=>!/[\/]\d+\./.test(p))).toBe(true)
  await sidebar.getByRole('link',{name:'Storage',exact:true}).click()
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Storage')
})

test('C143 first-routable docs entry works through an ordinary visitor click', async ({ page }, info) => {
  await open(page, '/', info)
  await page.getByTestId('get-started').click()
  await expect(page).toHaveURL(/\/docs\/start$/)
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Start here')
})

test('C144 navigation false removes the menu entry while keeping direct access', async ({ page }, info) => {
  await open(page, '/docs/reference/off-menu', info)
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Off Menu')
  await expect(page.getByTestId('sidebar').getByRole('link',{name:'Off Menu'})).toHaveCount(0)
})

test('C146 C147 C148 C149 C150 framework-free helpers walk find contain normalize and prune', async ({ page }, info) => {
  await open(page, '/inspect', info)
  const facts = JSON.parse(await page.getByTestId('helpers').innerText())
  expect(facts.first).toBe('/docs/start')
  expect(facts.child).toBe('/docs/start/installation')
  expect(facts.groupChild).toBe('/docs/reference/group/storage')
  expect(facts.trail).toEqual(['Reference','Advanced group','Storage'])
  expect(facts.missingTrail).toEqual([])
  expect(facts.contains).toEqual([true,false,false])
  expect(facts.missingContains).toEqual([false,false,false])
  expect(facts.normalized).toBe('/docs/start/installation')
  expect(facts.paths).toHaveLength(process.env.CHECK_ENV === 'development' ? 17 : 16)
  expect(facts.pruned).toEqual(['/docs/start','/docs/guides','/docs/reference'])
})

async function sitemap(baseURL, info) {
  const response = await fetch(new URL('/sitemap.xml', baseURL))
  const xml = await response.text()
  const evidence = info.outputPath('sitemap.xml')
  await writeFile(evidence, xml)
  await info.attach('Sitemap XML', { path: evidence, contentType: 'application/xml' })
  expect(response.status).toBe(200)
  return xml
}

test('C189 sitemap contains normalized canonical content routes', async ({ baseURL }, info) => {
  const xml = await sitemap(baseURL, info)
  for (const path of routes.filter(p => p !== '/docs/reference/limits')) expect(xml).toContain(`${baseURL}${path}</loc>`)
  expect(xml).not.toMatch(/\d+\.(?:start|guides|reference)/)
})

test('C190 sitemap excludes collection and document opt-outs', async ({ baseURL }, info) => {
  const xml = await sitemap(baseURL, info)
  for (const path of ['/internal', '/docs/reference/limits']) expect(xml).not.toContain(`${baseURL}${path}</loc>`)
})

test('C191 sitemap excludes data drafts and partials', async ({ baseURL }, info) => {
  const xml = await sitemap(baseURL, info)
  for (const path of ['/docs/reference/draft', '/docs/reference/_shared', '/settings/site']) expect(xml).not.toContain(`${baseURL}${path}</loc>`)
})

test('C199 sitemap opt-out pages remain prerendered while absent from XML', async ({ page, baseURL }, info) => {
  await open(page, '/docs/reference/limits', info)
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Limits')
  await page.goto('/internal')
  await expect(page.locator('main h1')).toHaveText('Internal reference')
  const xml = await sitemap(baseURL, info)
  for (const path of ['/internal', '/docs/reference/limits']) expect(xml).not.toContain(`${baseURL}${path}</loc>`)
})

test('C198 static HTML exists on direct loads for every public document', async ({ baseURL }, info) => {
  const results = []
  for(const path of routes){const r=await fetch(new URL(path,baseURL));const html=await r.text();results.push({path,status:r.status,hasHeading:/<h1[ >]/.test(html),hasBody:html.includes('data-testid="document"')})}
  await info.attach('Direct document responses',{body:JSON.stringify(results,null,2),contentType:'application/json'})
  expect(results.filter(x=>x.status!==200||!x.hasHeading||!x.hasBody)).toEqual([])
})

test('C004 C331 drafts partials and ignored invalid files are absent from production pages and sidebar', async ({ page, baseURL }, info) => {
  test.skip(process.env.CHECK_ENV === 'development', 'Drafts are intentionally visible in nuxt dev; production-only check')
  await open(page,'/docs/start',info)
  await expect(page.getByTestId('sidebar')).not.toContainText('Future feature')
  for(const path of ['/docs/reference/draft','/docs/reference/_shared','/docs/ignored']){
    const response=await fetch(new URL(path,baseURL));expect(response.status).toBe(404)
    const html=await response.text();expect(html).not.toContain('DRAFT_SENTINEL_DO_NOT_PUBLISH');expect(html).not.toContain('PARTIAL_SENTINEL_DO_NOT_PUBLISH')
  }
})

test('C354 C355 inline baseline supports GFM while excluding ingestion plugins and mappings', async ({ page }, info) => {
  await open(page,'/inspect',info)
  const inline=page.getByTestId('inline-table')
  await expect(inline.locator('table')).toContainText('A')
  await expect(inline.locator('input')).toBeChecked()
  await expect(inline.locator('blockquote')).toContainText('Safe baseline')
  await expect(inline.getByTestId('mapped-paragraph')).toHaveCount(0)
  await expect(page.getByTestId('inline-profile').locator('br')).toHaveCount(0)
  await expect(page.getByTestId('inline-profile')).toContainText('$x^2$')
  await expect(page.getByTestId('inline-profile').locator('.katex')).toHaveCount(0)
})

test('C357 ingested and inline comments do not enter rendered output or excerpts', async ({ page }, info) => {
  await open(page,'/inspect',info)
  await expect(page.getByTestId('inline')).not.toContainText('INLINE_COMMENT_SENTINEL')
  await open(page,'/docs/guides/markdown',info)
  await expect(page.getByTestId('document')).not.toContainText('COMMENT_SENTINEL_DO_NOT_PUBLISH')
})

test('X001 in-content links navigate client-side', async ({ page }, info) => {
  await open(page,'/docs/start/sharing',info)
  await page.evaluate(()=>{window.__demoNavigationMarker='same-document'})
  await page.getByTestId('document').getByRole('link',{name:'Read updates',exact:true}).click()
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Updates')
  expect(await page.evaluate(()=>window.__demoNavigationMarker)).toBe('same-document')
})

test('absolute Markdown links reach the intended page', async ({ page }, info) => {
  await open(page,'/docs/start/installation',info)
  await page.getByTestId('document').getByRole('link',{name:'First note',exact:true}).click()
  await expect(page).toHaveURL(/\/docs\/start\/first-note$/)
  await expect(page.getByTestId('document').locator('h1')).toHaveText('First Note')
  await page.goto('/docs/start/installation')
  await page.getByTestId('document').getByRole('link',{name:'Markdown guide',exact:true}).click()
  await expect(page).toHaveURL(/\/docs\/guides\/markdown$/)
})

test('shell links navigate client-side and preserve the document', async ({ page }, info) => {
  await open(page,'/docs/start',info)
  await page.evaluate(()=>{window.__demoNavigationMarker='same-document'})
  await page.getByTestId('sidebar').getByRole('link',{name:'Sharing',exact:true}).click()
  await expect(page.getByTestId('document').locator('h1')).toHaveText('Sharing')
  expect(await page.evaluate(()=>window.__demoNavigationMarker)).toBe('same-document')
})

// Slice 2b checks share the production target and viewport projects.
import "./docs-site-search-agent.mjs"
