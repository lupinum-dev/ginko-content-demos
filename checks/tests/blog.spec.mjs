import { test, expect } from '@playwright/test'
import { writeFile, readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'
const route = '/blog/note-01'
const ids = rows => rows.map(row => row.ref).sort()
const refs = numbers => numbers.map(n => `post:${String(n).padStart(2, '0')}`).sort()
const all = Array.from({ length: 30 }, (_, i) => i + 1)
async function query(request, info, verb, options = {}, collection = 'posts') {
 const response = await request.post(`/api/${verb}?collection=${collection}`, { data: options })
 const body = await response.text()
 const path = info.outputPath(`${verb}-${info.attachments.length}.json`)
 await writeFile(path, `${response.status()}\n${body}`)
 await info.attach(`${verb} ${collection}`, { path, contentType: 'application/json' })
 return { response, body: body ? JSON.parse(body) : null }
}
async function read(request, info, verb, options, collection) {
 const result = await query(request, info, verb, options, collection)
 if (result.body === null) expect([200,204]).toContain(result.response.status())
 else expect(result.response.status(), result.body?.message).toBe(200)
 return result.body
}
async function reject(request, info, verb, options, collection) {
 const result = await query(request, info, verb, options, collection)
 expect(result.response.status(), JSON.stringify(result.body)).toBeGreaterThanOrEqual(400)
}

test('C007 C008 C010 C313 C314 C315 C316 collection formats, exclusion and non-strict originals', async ({ request }, info) => {
 const posts = await read(request, info, 'many')
 expect(ids(posts)).toEqual(refs(all))
 const authors = await read(request, info, 'many', {}, 'authors')
 expect(authors.map(a => a.name).sort()).toEqual(['Ada','Lin'])
 for (const author of authors) expect((await request.get(author.route.resolvedPath)).status()).toBe(404)
 expect((await read(request, info, 'many', {}, 'categories')).map(c => c.title).sort()).toEqual(['Ecology','Engineering'])
 const legacy = await read(request, info, 'many', {}, 'legacy')
 expect(legacy.find(doc => doc.title === 42)).toMatchObject({ title: 42, original: 'preserved' })
 expect((await read(request, info, 'many', {}, 'json5'))[0]).toMatchObject({ title: 'JSON5 note', enabled: true })
 const csv = await read(request, info, 'many', {}, 'tables')
 expect(csv[0].body).toEqual([{ title: 'Ecology', order: '1' }, { title: 'Engineering', order: '2' }])
 const sitemap = await request.get('/api/sitemap')
 expect(sitemap.status()).toBe(200)
 expect(await sitemap.text()).not.toMatch(/authors|categories|draft|excluded/)
 expect(await sitemap.json()).toHaveLength(30) // 30 route-backed posts.
})
const fieldCases = [
 ['C017','title','text','Note'], ['C018','summary','textarea','Line one\nLine two'], ['C019','rich','richtext','**Useful**'], ['C020','slug','slug','a-note'], ['C021','email','email','editor@example.com'], ['C022','url','url','https://example.com'], ['C023','rank','number',2], ['C024','featured','boolean',false], ['C025','date','date','2026-09-01'], ['C026','publishedAt','datetime','2026-09-01T08:00:00.000Z'], ['C027','status','select','review'], ['C028','extra','json',{ value: [1,true] }], ['C029','icon','icon','lucide:leaf'], ['C030','details','object',{ note:'Nested',secret:'Hidden' }], ['C031','tags','array',['web']], ['C032','image','image','/leaf.png'], ['C033','author','relation','author:ada'], ['C034','categories','relations',['category:ecology']]
]
for (const [id,key,type,value] of fieldCases) test(`${id} valid and invalid ${key} fields with metadata`, async ({ request }, info) => {
 const response = await request.get('/api/fields')
 const body = await response.json()
 await info.attach('field probes', { body: JSON.stringify(body), contentType: 'application/json' })
 expect(response.status()).toBe(200)
 expect(body.fields[key].valid).toEqual({ success:true,data:value })
 expect(body.fields[key].invalid.success).toBe(false)
 expect(body.fields[key].metadata).toMatchObject({ type, required: true })
 if (key === 'slug') expect(body.fields[key].metadata.slugFrom).toBe('title')
})
test('C016 URL segments normalize accents spaces and optional case', async ({ request }) => {
 const body = await (await request.get('/api/fields')).json()
 expect(body.slugs).toEqual(['ae-new-note','Ae-New-Note'])
})

test('C014 constrained references from Markdown and YAML records', async ({ request }, info) => {
 const post = await read(request, info, 'one', { by: { ref: 'post:01' }, populate: { author: 'authors' } })
 expect(post.author.name).toBe('Lin')
 const author = await read(request, info, 'one', { by: { ref: 'author:ada' }, populate: { favorite: 'posts' } }, 'authors')
 expect(author.favorite.title).toBe('Note 01')
})
test('C092 C094 route path and ref selectors, null miss, malformed selectors rejected', async ({ request }, info) => {
 for (const by of [{ route },{ path:'/note-01' },{ ref:'post:01' }]) {
  const post = await read(request, info, 'one', { by })
  expect(post).toMatchObject({ title:'Note 01',locale:'en',route:{resolvedPath:route},resolution:{usedFallback:false,resolved:{locale:'en'}} })
 }
 expect(await read(request, info, 'one', {by:{ref:'missing'}})).toBeNull()
 for (const by of [{},{ route, ref:'post:01' }]) await reject(request,info,'one',{by})
})
test('C095 C096 bounded many skip and misses with ceiling rejection', async ({ request }, info) => {
 expect(ids(await read(request,info,'many',{limit:2,skip:1,sort:{title:'asc'}}))).toEqual(refs([2,3]))
 expect(await read(request,info,'many',{where:{title:'Missing'}})).toEqual([])
 expect(await read(request,info,'many',{limit:100,skip:10000})).toEqual([])
 for (const options of [{limit:101},{skip:10001},{skip:-1}]) await reject(request,info,'many',options)
})
test('C097 numeric ascending and descending ordered multi-field sort', async ({ request }, info) => {
 for (const direction of ['asc','desc']) {
  const rows = await read(request,info,'many',{sort:{featured:'asc',rank:direction}})
  const odd = all.filter(n=>n%2); const even = all.filter(n=>!(n%2))
  expect(rows.map(r=>r.rank)).toEqual(direction === 'asc' ? [...odd,...even] : [...odd.reverse(),...even.reverse()])
 }
})
test('C098 exact filtered count', async ({ request }, info) => {
 expect(await read(request,info,'count',{where:{tags:{$contains:'nature'}}})).toBe(15)
 expect(await read(request,info,'count',{where:{rank:{$gt:29}}})).toBe(1)
 expect(await read(request,info,'count',{where:{rank:999}})).toBe(0)
})
test('C099 offset pages preserve exact totals and neighbors', async ({ request }, info) => {
 for (const [page,previousPage,nextPage] of [[1,null,2],[2,1,3],[3,2,null]]) {
  const result = await read(request,info,'paginate',{mode:'offset',page,limit:10,sort:{title:'asc'}})
  expect(result).toMatchObject({mode:'offset',page,limit:10,total:30,pageCount:3,previousPage,nextPage,hasNext:nextPage!==null,hasPrevious:previousPage!==null})
  expect(ids(result.data)).toEqual(refs(all.slice((page-1)*10,page*10)))
 }
})
test('C100 cursor continuation visits all posts exactly once without totals', async ({ request }, info) => {
 let after; const seen=[]
 for (let i=0;i<3;i++) {
  const result=await read(request,info,'paginate',{mode:'cursor',limit:10,sort:{title:'asc'},...(after?{after}:{})})
  expect(result.mode).toBe('cursor');expect(result).not.toHaveProperty('total');expect(result).not.toHaveProperty('page')
  expect(result.hasNext).toBe(i<2);expect(result.data).toHaveLength(10)
  seen.push(...result.data.map(r=>r.ref));after=result.endCursor
  if(i<2) expect(typeof after).toBe('string')
 }
 expect(seen).toEqual(refs(all))
})
test('C101 mixed pagination modes reject', async ({ request }, info) => {
 await reject(request,info,'paginate',{mode:'offset',after:'abc'})
 await reject(request,info,'paginate',{mode:'cursor',page:1})
})
test('C103 metadata and explicit via backlinks', async ({ request }, info) => {
 for(const via of [undefined,['author']]) {
  const rows=await read(request,info,'backlinks',{by:{ref:'author:ada'},from:'posts',...(via?{via}:{}),sort:{title:'asc'}},'authors')
  expect(ids(rows)).toEqual(refs(all.filter(n=>!(n%2))))
 }
})
test('C104 backlinks reject undeclared source fields', async ({ request }, info) => {
 await reject(request,info,'backlinks',{by:{ref:'author:ada'},from:'settings'},'authors')
})
test('C107 scalar array and missing references populate and survive select', async ({ request }, info) => {
 const post=await read(request,info,'one',{by:{ref:'post:01'},select:['title'],populate:{author:'authors',categories:'categories',related:'posts'}})
 expect(post.author.name).toBe('Lin');expect(post.categories.map(c=>c.title)).toEqual(['Engineering']);expect(post.related.map(c=>c.title)).toEqual(['Note 02'])
 // Missing reference fixture is a data record to avoid exposing broken links to visitors.
 const missing=await read(request,info,'one',{by:{ref:'legacy:missing'},populate:{favorite:'posts'}},'legacy')
 expect(missing.favorite).toBeNull()
 const arrays=await read(request,info,'one',{by:{ref:'legacy:missing'},populate:{related:'posts'}},'legacy')
 expect(arrays.related.map(p=>p.title)).toEqual(['Note 01'])
})
test('C112 target mismatch and unsupported populate verbs reject', async ({ request }, info) => {
 await reject(request,info,'one',{by:{ref:'post:01'},populate:{author:'categories'}})
 for(const verb of ['surround','navigation']) await reject(request,info,verb,{by:{ref:'post:01'},populate:{author:'authors'}})
})
test('C113 authored select retains envelope and omits other authored fields', async ({ request }, info) => {
 const doc=await read(request,info,'one',{by:{ref:'post:01'},select:['title']})
 expect(doc.title).toBe('Note 01');expect(doc).not.toHaveProperty('summary');expect(doc).not.toHaveProperty('body')
 for (const key of ['id','canonicalKey','collection','locale','route','resolution']) expect(doc).toHaveProperty(key)
 expect(doc.route.resolvedPath).toBe(route)
})
const operatorCases = [
 ['C115','$eq',{rank:{$eq:1}},[1]],['C116','$ne',{rank:{$ne:1}},all.slice(1)],
 ['C117','$gt number',{rank:{$gt:28}},[29,30]],['C117','$gt date',{date:{$gt:'2026-09-28'}},[29,30]],
 ['C118','$gte',{rank:{$gte:29}},[29,30]],['C119','$lt number',{rank:{$lt:3}},[1,2]],['C119','$lt date',{date:{$lt:'2026-09-03'}},[1,2]],['C120','$lte',{rank:{$lte:2}},[1,2]],
 ['C121','$in',{rank:{$in:[1,30]}},[1,30]],['C122','$nin',{rank:{$nin:[1,30]}},all.slice(1,-1)],
 ['C123','$contains array',{tags:{$contains:'nature'}},all.filter(n=>!(n%2))],['C123','$contains string',{title:{$contains:'Note 01'}},[1]],
 ['C124','$containsAny',{tags:{$containsAny:['nature','missing']}},all.filter(n=>!(n%2))],['C125','$icontains',{title:{$icontains:'nOTE 01'}},[1]],
 ['C126','$exists',{rank:{$exists:true}},all],['C127','$type',{rank:{$type:'number'}},all],['C128','$prefix',{path:{$prefix:'/note-0'}},all.slice(0,9)],
 ['C129','$and',{$and:[{rank:{$gt:1}},{rank:{$lt:4}}]},[2,3]],['C130','$or',{$or:[{rank:1},{rank:30}]},[1,30]],['C131','$not',{$not:{rank:{$gt:2}}},[1,2]]
]
for(const [id,name,where,numbers] of operatorCases) test(`${id} discriminating ${name} exact matches and nonmatches`,async({request},info)=>{
 expect(ids(await read(request,info,'many',{where,sort:{title:'asc'}}))).toEqual(refs(numbers))
 expect(await read(request,info,'many',{where:{$and:[where,{title:'No such note'}]}})).toEqual([])
})
test('C132 direct equality equals explicit eq',async({request},info)=>{
 const direct=await read(request,info,'many',{where:{rank:1}});const explicit=await read(request,info,'many',{where:{rank:{$eq:1}}})
 expect(ids(direct)).toEqual(['post:01']);expect(explicit).toEqual(direct)
})
test('C133 regex options and SQL grammar reject',async({request},info)=>{
 for(const where of [{title:{$regex:'Note'}},{title:{$options:'i'}},'rank > 1']) await reject(request,info,'many',{where})
})
test('C002 C091 C109 browser populated query has parity with server and one custom endpoint request',async({page,request},info)=>{
 await page.goto('/inspect');await page.waitForLoadState('networkidle')
 const requests=[];page.on('request',r=>{if(r.url().includes('/api/blog-content/')) requests.push(r.url())})
 await page.getByTestId('populate').click();await expect(page.getByTestId('client')).toContainText('Lin')
 const client=JSON.parse(await page.getByTestId('client').textContent())
 const server=await read(request,info,'one',{by:{ref:'post:01'},select:['title'],populate:{author:'authors'}})
 expect(client).toEqual(server);expect(requests).toHaveLength(1);expect(requests[0]).toContain('/api/blog-content/')
})
test('C153 existing content remains success after direct load and hydration',async({page})=>{
 expect((await page.goto(route)).status()).toBe(200)
 await page.waitForLoadState('networkidle')
 await expect(page.getByTestId('status')).toHaveText('success')
})
test('C153 missing content status reaches app-owned 404',async({page})=>{
 expect((await page.goto('/blog/missing')).status()).toBe(404)
 await expect(page.getByText('Post not found',{exact:true}).first()).toBeVisible()
})
test('C156 refresh reads page and optional surround with one additional request',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle')
 await page.getByTestId('post-card').first().getByRole('link').click();await expect(page.locator('main h1')).toHaveText('Note 30');await page.waitForLoadState('networkidle')
 const requests=[]
 page.on('request',r=>{if(r.url().includes('/api/blog-content/'))requests.push(r.url())})
 await page.getByTestId('refresh').click();await page.waitForLoadState('networkidle')
 expect(requests).toHaveLength(2)
})
test('C157 SSR list and detail use sealed runtime content, data has no page, unhandled mount no Vue route',async({page,request},info)=>{
 for(const [url,heading] of [['/','Field notes'],[route,'Note 01']]){
  const response=await request.get(url);const html=await response.text()
  await info.attach('SSR HTML',{body:html,contentType:'text/html'})
  expect(response.status()).toBe(200);expect(html).toContain(heading)
  expect((await page.goto(url)).status()).toBe(200);await expect(page.locator('main h1')).toHaveText(heading)
 }
 expect((await request.get('/authors/ada')).status()).toBe(404)
 expect((await request.get('/unhandled/hello')).status()).toBe(404)
})
test('C208 C212 runtime HTML and negotiated Markdown at same URL',async({request},info)=>{
 const html=await request.get(route,{headers:{Accept:'text/html'}});const md=await request.get(route,{headers:{Accept:'text/markdown'}})
 expect(html.status()).toBe(200);expect(html.headers()['content-type']).toContain('text/html');expect(await html.text()).toContain('<h1')
 expect(md.status()).toBe(200);expect(md.headers()['content-type']).toContain('text/markdown');expect(await md.text()).toContain('# Note 01')
 await info.attach('Negotiated Markdown',{body:await md.text(),contentType:'text/markdown'})
})
test('C213 Markdown missing page recovery preserves 404 and excludes API assets',async({request},info)=>{
 const missing=await request.get('/missing',{headers:{Accept:'text/markdown'}})
 expect(missing.status()).toBe(404);expect(missing.headers()['content-type']).toContain('text/markdown')
 const body=await missing.text();for(const link of ['/llms.txt','/llms-full.txt'])expect(body).toContain(link)
 await info.attach('Recovery Markdown',{body,contentType:'text/markdown'})
 for(const path of ['/api/missing','/_nuxt/missing.js']){
  const response=await request.get(path,{headers:{Accept:'text/markdown'}})
  expect(response.status()).toBe(404);expect(response.headers()['content-type']).not.toContain('text/markdown')
 }
})
async function secrets() {
 const source=await readFile(new URL('../../apps/blog/.env.test',import.meta.url),'utf8')
 return Object.fromEntries(source.trim().split('\n').map(line=>line.split('=')))
}
async function revalidate(request,body,kind='valid'){
 const secret=(await secrets()).GINKO_CONTENT_REVALIDATE_TOKEN
 const timestamp=String(Date.now()-(kind==='expired'?600000:0));const event='blog-demo-check'
 const signature=createHmac('sha256',secret).update(`${timestamp}.${event}.${body}`).digest('hex')
 return request.post('/api/blog-content/revalidate',{data:body,headers:{'content-type':'application/json','x-ginko-signature-timestamp':timestamp,'x-ginko-revalidation-event':event,'x-ginko-signature':`sha256=${kind==='tampered'?'0'.repeat(64):signature}`}})
}
test('C289 C290 C291 configured signed revalidation rejects unauthorized and header-only purges',async({request},info)=>{
 for(const [kind,status] of [['valid',501],['tampered',401],['expired',401]]){
  const response=await revalidate(request,'{"tags":["collection:posts"]}',kind)
  const body=await response.text();await info.attach(`Revalidation ${kind}`,{body:`${response.status()}\n${body}`,contentType:'text/plain'})
  expect(response.status()).toBe(status)
  if(kind==='valid')expect(body).toContain('revalidation_not_supported')
 }
})
test('C292 purge byte entries and entry length ceilings reject before adapter',async({request},info)=>{
 for(const [body,status] of [[JSON.stringify({tags:['a'.repeat(33000)]}),413],[JSON.stringify({tags:Array.from({length:201},(_,i)=>`tag:${i}`)}),400],[JSON.stringify({paths:['/'+ 'a'.repeat(1000)]}),400]]){
  const response=await revalidate(request,body);await info.attach('Purge ceiling response',{body:`${response.status()}\n${await response.text()}`,contentType:'text/plain'})
  expect(response.status()).toBe(status)
 }
})
test('C305 production filesystem preview token cannot open overlay',async({request},info)=>{
 const secret=(await secrets()).GINKO_CONTENT_PREVIEW_TOKEN
 const response=await request.post('/api/many',{data:{},headers:{'x-nuxt-content-preview':secret}})
 const body=await response.text();await info.attach('Preview rejection',{body:`${response.status()}\n${body}`,contentType:'text/plain'})
 expect(response.status()).toBeGreaterThanOrEqual(400)
 expect(response.headers()['cache-control']).toMatch(/private|no-store/)
})
test('C312 transformer output is shared by query and navigation',async({request},info)=>{
 const doc=await read(request,info,'one',{by:{ref:'post:01'}});expect(doc.derivedLabel).toBe('Note: Note 01')
 const tree=await read(request,info,'navigation',{select:['derivedLabel']})
 const flat=items=>items.flatMap(item=>[item,...flat(item.children??[])])
 expect(flat(tree).find(item=>item.path===route)?.derivedLabel).toBe('Note: Note 01')
})
test('C359 public runtime config excludes schemas sources cache modules and secrets',async({page,request})=>{
 const html=await (await request.get('/')).text()
 expect(html).not.toMatch(/GINKO_CONTENT_|server\/content-cache|posts\/\*\*|fieldSchemas|cms\.fields/)
 const config=html.match(/window\.__NUXT__\.config=.*?<\/script>/s)?.[0]
 expect(config).toBeDefined()
 expect(config).not.toMatch(/providers|source|schema|cms|token|revalidate/i)
})
test('X003 blog guide source glob yields the documented mount-relative slug',async({request})=>{
 const response=await request.get('/blog/note-01')
 expect(response.status()).toBe(200)
})
test('X004 dotted projection returns selected nested authored value',async({request},info)=>{
 const doc=await read(request,info,'one',{by:{ref:'post:01'},select:['details.note']})
 expect(doc.details).toEqual({note:'Nested 01'})
})
test('X005 query results do not mutate the sealed provider cache',async({request},info)=>{
 const response=await request.get('/api/alias');const body=await response.json();await info.attach('Mutation probe',{body:JSON.stringify(body),contentType:'application/json'})
 expect(body.note).toBe('Nested 01')
})
test('X006 aggregate ETag represents both query dependencies',async({request},info)=>{
 const response=await request.get('/api/cache');const body=await response.json();await info.attach('Cache hint merge',{body:JSON.stringify(body),contentType:'application/json'})
 expect(body.hint).toMatchObject({maxAge:60,swr:30,tags:['first','second']})
 expect(body.hint.etag).not.toBe('"second"')
})
async function localSupport(info) {
 const data=JSON.parse(await readFile(new URL('../../results/evidence/blog/local-support.json',import.meta.url),'utf8'))
 await info.attach('Local build support, separate from production HTTP evidence',{body:JSON.stringify(data),contentType:'application/json'})
 return data
}
test('C014 K001 documented cross-collection reference prepares without a target',async({},info)=>{
 const result=(await localSupport(info)).crossReference
 expect(result.exitCode,'See '+result.evidence+'; documented reference() without a target should prepare').toBe(0)
})
test('C338 semicolon CSV object output in production and row-array output in isolated local build',async({request},info)=>{
 const objectRows=(await read(request,info,'many',{},'tables'))[0].body
 expect(objectRows).toEqual([{title:'Ecology',order:'1'},{title:'Engineering',order:'2'}])
 const local=(await localSupport(info)).csvRows
 expect(local.exitCode).toBe(0);expect(local.httpStatus).toBe(200)
 expect(local.body[0].body).toEqual([['title','order'],['Ecology','1'],['Engineering','2']])
})
test('C208 C200 local output has no prerendered HTML and retains generated query dependencies',async({},info)=>{
 const artifacts=(await localSupport(info)).runtimeArtifacts
 expect(artifacts.html).toEqual([]);expect(artifacts.queryDependencies).toBeGreaterThan(0);expect(artifacts.rawMarkdown).toBe(30)
})
test('C289 local no-token build omits the revalidation endpoint',async({},info)=>{
 expect((await localSupport(info)).withoutToken.registeredRevalidation).toBe(false)
})
test('X007 K002 malformed JSON is rejected by isolated production-built filesystem parser',async({},info)=>{
 const result=(await localSupport(info)).malformed
 expect(result.exitCode).toBe(0)
 expect(result.httpStatus,'Malformed JSON must not become an empty document; '+result.responseEvidence).toBeGreaterThanOrEqual(400)
})
test('C157 isolated content mount without a Vue handler fails discovery with 404',async({},info)=>{
 const result=(await localSupport(info)).missingHandler
 const log=await readFile(new URL('../../'+result.evidence,import.meta.url),'utf8')
 expect(result.exitCode).toBe(1);expect(log).toContain('[404]');expect(log).toContain('/unhandled/hello')
 await info.attach('Expected missing Vue handler build failure',{body:log,contentType:'text/plain'})
})

test('C200 C208 K003 Vercel runtime delivery leaves no HTML files in platform static output',async({},info)=>{
 const artifacts=(await localSupport(info)).vercelArtifacts
 expect(artifacts.pageHtml, 'Runtime delivery must not retain public HTML in Vercel static output').toEqual([])
})
test('C153 refresh errors remain distinct from not-found after browser card navigation',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle')
 await page.getByTestId('post-card').first().getByRole('link').click();await expect(page.locator('main h1')).toHaveText('Note 30')
 await expect(page.getByTestId('status')).toHaveText('success')
 await page.route('**/api/blog-content/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"Test transport failure"}'}))
 await page.getByTestId('refresh').click();await expect(page.getByTestId('status')).toHaveText('error')
})
