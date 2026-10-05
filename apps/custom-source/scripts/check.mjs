import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import * as cms from '@lupinum/ginko-content/cms-contract'
import * as portable from '@lupinum/ginko-content/portability'
import * as io from '@lupinum/ginko-content/portability/node'
import { readResolvedContentContract } from '@lupinum/ginko-content/cms-contract/node'
import { defineCollection, fields, getContentFieldMetadata, isContentFieldSchema } from '@lupinum/ginko-content/config'
import { z } from 'zod'
const evidence = resolve('../../results/evidence/custom-source')
await mkdir(evidence, { recursive: true })
const checks = []
async function check(ids, name, fn) {
  try { await fn(); checks.push({ ids: ids.split(' '), check: `${ids} ${name}`, status: 'pass', mode: 'build-only', errors: [] }) }
  catch (error) { checks.push({ ids: ids.split(' '), check: `${ids} ${name}`, status: 'fail', mode: 'build-only', errors: [error.stack], code: error.code }) }
}
const { contract, sha256 } = await readResolvedContentContract({ root: process.cwd() })
await check('C246 C247', 'read canonical prepared contract and verify canonical hash', async () => {
  cms.assertResolvedContentContract(contract)
  assert.equal(sha256, createHash('sha256').update((await readFile('.ginko/content-contract.json','utf8')).trimEnd()).digest('hex'))
  assert.equal(await cms.hashCanonicalJson(contract), sha256)
  assert.equal(contract.collections.docs.routing.pathPrefix, '/docs')
})
await check('C013', 'explicit CMS label structure and routing survive resolution', () => {
  assert.equal(contract.collections.docs.structure, 'tree')
  assert.equal(contract.collections.docs.label, 'Catalog documentation')
  assert.equal(contract.collections.docs.routing.allowMultipleRoots, true)
  assert.equal(contract.collections.docs.fields.find(f => f.key === 'category').searchable, true)
})
await check('K301', 'data title and description remain in the resolved contract (D-02)', () => {
  assert.deepEqual(contract.collections.inventory.fields.map(f => f.key), ['title', 'description'])
})
await check('C015 C035 C036 C037 C038 C039', 'field modifiers retain validation and metadata', () => {
  const f = fields.text().label('Heading').help('Editor text').localized().required()
  assert.equal(f.safeParse(undefined).success, false)
  assert.equal(f.safeParse(42).success, false)
  assert.equal(f.parse('ok'), 'ok')
  assert.equal(isContentFieldSchema(f), true)
  const metadata = getContentFieldMetadata(f)
  assert.equal(metadata.label, 'Heading'); assert.equal(metadata.description, 'Editor text'); assert.equal(metadata.localized, true); assert.equal(metadata.required, true)
  assert.equal(getContentFieldMetadata(fields.number().shared()).localized, false)
  assert.equal(getContentFieldMetadata(z.string()), null)
})
const projected = async s => cms.projectMdcDocument(await cms.parseMdcDocument(s, { autoClose: false })).body
async function roundtrip(source, inspect = () => {}) {
  const d = await cms.parseMdcDocument(source, { autoClose: false })
  const output = await cms.serializeMdcDocument(d)
  assert.deepEqual(await projected(output), cms.projectMdcDocument(d).body)
  inspect(output, d)
}
for (const [id, title, source] of [
  ['C069','literal MDC-looking text and ordinary colons',String.raw`\:\:card and \:fire and \{name\}. Time: 10:30.\n\n\#slot`],
  ['C071','nested code and inline code','- Item\n\n  ```md\n\n  ::notice\n  ```\n\n`::notice`'],
  ['C072','list-leading code quote and table','- ```js\n  let x = 1\n  ```\n\n- > A quote\n\n- | A | B |\n  | --- | --- |\n  | x | y |'],
  ['C073','adjacent lists strike and hard break','- one\n\n1. two\n\n~~gone~~  \nnext\n\nLiteral: | --- |'],
  ['C074','fence containing component terminators','::notice{title="Code"}\n```md\n::\n<Notice>\n```\n::'],
  ['C078','hostile typed props','::notice{title=\'Quote " and { braces }\' :count="2" :enabled="false"}\nText\n::'],
  ['C079','spaces and alt text','![A cat](<https://example.com/a b.png>)\n\n[Space](<https://example.com/a b>)\n\nftp.example.org'],
  ['C083','multiline props nested in quote and list','> ::notice\n> ---\n> title: Quote\n> count: 2\n> ---\n> Text\n> ::\n\n- ::notice{title="List"}\n  Text\n  ::'],
  ['C084','link titles are strings','[Link](https://example.com "[1]")'],
  ['C088','JSON-like prop strings and arrays','::notice{title="[1,2]" :items="[1,2]"}\nText\n::']
]) await check(id, `round-trip ${title}`, () => roundtrip(source))
await check('C078 C088', 'typed props preserve multiline strings and omit undefined values', async () => {
  const d = await cms.parseMdcDocument('<Notice title="Safe" :items="[1,2]" :enabled="false">\nText\n</Notice>')
  const node = d.nodes[0]
  node[1].title = '[1,2]'
  const stringRoundTrip = await cms.parseMdcDocument(await cms.serializeMdcDocument(d), { autoClose:false })
  assert.equal(stringRoundTrip.nodes[0][1].title, '[1,2]')
  assert.deepEqual(node[1].items, [1,2])
  assert.equal(node[1].enabled, false)
  node[1].title = 'first line\n"}\n:enabled=true\nlast line'
  node[1].ignored = undefined
  const output = await cms.serializeMdcDocument(d)
  const reparsed = await cms.parseMdcDocument(output, { autoClose:false })
  assert.equal(reparsed.nodes[0][1].title, node[1].title)
  assert.equal(reparsed.nodes[0][1].enabled, false)
  assert.equal(Object.hasOwn(reparsed.nodes[0][1],'ignored'), false)
})
await check('C070 C343', 'heading helpers match duplicates and preserve custom IDs', async () => {
  const heading = (await cms.parseMdcBody('## Über Café')).body.children[0]; assert.equal(heading.props.id, cms.slugifyHeading('Über Café'))
  const id = cms.createHeadingIdGenerator(); assert.equal(id('Intro', 2), 'intro'); assert.equal(id('Intro', 2), 'intro-1')
  await roundtrip('## Intro\n\n## Intro\n\n## Custom {#authored}', output => { assert.match(output, /authored/); assert.doesNotMatch(output, /\{#intro\}/) })
})
await check('C076 C248', 'fixed portable parser does not autolink or run site math plugin', async () => {
  const { body } = await cms.parseMdcBody('example.com test@example.com ftp://example.com //example.com\n\n$x^2$\n\n[Explicit](https://example.com)')
  const tags = []
  const walk = n => { if (n && typeof n === 'object') { if (n.tag) tags.push(n.tag); for (const c of n.children ?? []) walk(c) } }
  walk(body); assert.equal(tags.filter(t => t === 'a').length, 1); assert.equal(tags.includes('math'), false)
})
await check('C080 C090', 'preview closes unfinished syntax but ingestion rejects it', async () => {
  const source = '::notice{title="Preview"}\n```md\n:: inside code'
  const preview = await cms.parseMdcDocument(source)
  assert.match(await cms.serializeMdcDocument(preview), /inside code/)
  await assert.rejects(cms.parseMdcDocument('<Notice title="unfinished', { autoClose: false }), cms.AngleComponentSyntaxError)
})
await check('C085 C089', 'unrepresentable native attributes and alt text throw typed errors', async () => {
  const d = await cms.parseMdcDocument('![safe](https://example.com/image.png)')
  const image = d.nodes.find(n => Array.isArray(n) && n[0] === 'p')?.slice(2).find(n => Array.isArray(n) && n[0] === 'img')
  assert.ok(image); image[1].alt = 'trailing' + String.fromCharCode(92)
  await assert.rejects(cms.serializeMdcDocument(d), cms.MdcSerializationError)
  const link = await cms.parseMdcDocument('[ok](https://example.com)')
  const node = link.nodes[0][2]; node[1].rel = '[1,2]'
  await assert.rejects(cms.serializeMdcDocument(link), cms.MdcSerializationError)
})
await check('C089', 'invalid angle property names throw typed serialization errors', async () => {
  const d = await cms.parseMdcDocument('<Notice title="Safe">\nBody\n</Notice>')
  const component = d.nodes.find(n => Array.isArray(n) && typeof n[0] === 'string' && n[0].toLowerCase() === 'notice')
  assert.ok(component)
  component[1]['bad name'] = 'value'
  await assert.rejects(cms.serializeMdcDocument(d), cms.MdcSerializationError)
})
await check('C077 C255 C256', 'public URL/name rules reject malformed and credential-bearing URLs', () => {
  for (const value of ['http:evil','http:///evil','javascript:alert(1)','//evil.com','https://user:pass@example.com']) assert.equal(cms.isSafePublicLinkUrl(value), false, value)
  assert.equal(cms.isSafePublicLinkUrl('http://example.com'), true)
  assert.equal(cms.isSafePublicMarkdownUrl('http://example.com/a.png','asset'), false)
  assert.equal(cms.isSafePublicMarkdownUrl('https://example.com/a.png','asset'), true)
  assert.equal(cms.isValidPortableComponentName('notice'), true)
  assert.equal(cms.isValidPortableComponentName('bad name'), false)
  assert.equal(cms.isStoredPortableAssetIdentity('asset_123'), true)
  assert.equal(cms.isStoredPortableAssetIdentity('javascript:evil'), false)
})
await check('C253', 'inert render policy rejects scripts and unknown components', async () => {
  const body = (await cms.parseMdcBody('Safe **text**')).body
  assert.equal(cms.validatePublicMarkdownAst(body, { components: {} }).ok, true)
  assert.equal(cms.validatePublicMarkdownAst({ type: 'root', children: [{ type: 'element', tag: 'script', props: {}, children: [] }] }, { components: {} }).ok, false)
  assert.equal(cms.validateStoredPortableMarkdownAst((await cms.parseMdcBody('::unknown\ntext\n::')).body, { components: {} }).ok, false)
})
const policy = { components: {} }
await check('C249 C250 C251', 'stored media collects repeated identities in order and remaps asynchronously', async () => {
  const source = '![One](asset_one)\n\nasset_text\n\n`![Code](asset_code)`\n\n![Again](asset_one)\n\n![Two](asset_two)\n'
  assert.deepEqual(await portable.collectStoredMdcAssetReferences(source, policy), ['asset_one','asset_one','asset_two'])
  assert.equal(await portable.rewriteStoredMdcAssetReferencesForStorage(source, policy, async id => id), source)
  const changed = await portable.rewriteStoredMdcAssetReferencesForStorage(source, policy, async id => id === 'asset_one' ? 'asset_new' : id)
  assert.deepEqual(await portable.collectStoredMdcAssetReferences(changed, policy), ['asset_new','asset_new','asset_two'])
  await assert.rejects(portable.collectStoredMdcAssetReferences('::unknown\ntext\n::', policy))
})
await check('C245', 'separate CMS wire protocol must agree before result parsing', () => {
  assert.equal(cms.createCmsProviderWireEnvelope(null).protocol, cms.CMS_PROVIDER_WIRE_PROTOCOL)
  assert.throws(() => cms.parseCmsPageWireResult({ protocol: 'skew/v9', result: null }))
})
await check('C254', 'current and pinned resolved contract validators', () => {
  cms.assertResolvedContentContractV1(contract)
  assert.throws(() => cms.assertResolvedContentContractV2(contract))
  assert.throws(() => cms.assertResolvedContentContract({ ...contract, version: 99 }))
})
await check('C257 C348', 'V2 policy unions allowed values nesting and V1 documents in V2 manifests', async () => {
  const policy = { version: 2, components: {
    notice: { kind: 'block', props: { tone: { types: ['string','number'], required: true, allowedValues: ['info',1] } }, slots: ['default'], allowedParents: null, allowedChildren: [], media: null }
  } }
  cms.assertPortableComponentPolicyV2(policy)
  const v2 = cms.buildResolvedContentContract({ collections: { pages: defineCollection({ type: 'page' }) } }, { defaultLocale: 'en', locales: ['en'], componentPolicy: policy })
  cms.assertResolvedContentContractV2(v2)
  const valid = (await cms.parseMdcBody('::notice{tone="info"}\nText\n::')).body
  assert.equal(cms.validatePublicMarkdownAst(valid, policy).ok, true)
  const invalid = (await cms.parseMdcBody('::notice{tone="wrong"}\nText\n::')).body
  assert.equal(cms.validatePublicMarkdownAst(invalid, policy).ok, false)
  const nested = (await cms.parseMdcBody('::notice{tone="info"}\n::notice{tone="info"}\nText\n::\n::')).body
  assert.equal(cms.validatePublicMarkdownAst(nested, policy).ok, false)
  const doc = portable.validatePortableDocument({ format: 'ginko-content-document', version: 1, collection: 'pages', canonicalKey: '/guide', locale: 'en', slug: 'guide', parentCanonicalKey: null, order: null, shared: { title: 'Guide' }, localized: {}, body: { kind: 'mdc', source: '# Guide' }, visibility: { navigation: true, search: true, sitemap: true } }, v2)
  const bytes = new TextEncoder().encode(await portable.serializePortableDocument(doc,v2))
  const manifest = await portable.rebuildPortableManifest({ contract: v2, documents: [{ file: portable.portableDocumentPath(doc,v2), document:doc, bytes }], assets: [] })
  assert.equal(manifest.version, 2); assert.equal(doc.version, 1)
})
await check('C258 C344', 'managed media constants and first invalid byte limit', async () => {
  assert.deepEqual([...cms.CONTENT_MANAGED_MEDIA_TYPES], ['image/png','image/jpeg','image/gif','image/webp'])
  assert.equal(cms.PORTABLE_CONTENT_LIMITS.assetBytes, 25 * 1024 * 1024)
  await assert.rejects(cms.verifyPublicImageBytes(new Uint8Array(cms.PORTABLE_CONTENT_LIMITS.assetBytes + 1)))
})
await check('C345', 'public schema helpers inspect optional/default/reference fields', () => {
  const schema = fields.object({ name: fields.text(), related: fields.relation('products'), count: fields.number().default(1) })
  assert.deepEqual(Object.keys(cms.getObjectShape(schema)), ['name','related','count'])
  assert.equal(cms.getSchemaTypeName(cms.unwrapSchema(fields.text())), 'ZodString')
  assert.ok(cms.getReferenceDescriptor(schema.shape.related))
  assert.ok(cms.collectTopLevelReferenceFields(schema).length)
})
await check('C346', 'shared path draft partial and canonical identity helpers', () => {
  assert.equal(cms.generatePath('docs/1.start/2.care'), '/docs/start/care')
  assert.equal(cms.isDraftPath('docs/.draft.md'), true)
  assert.equal(cms.isPartialPath('docs/_partial.md'), true)
  assert.equal(cms.mountContentPath('/care', 'en', { en: '/docs' }), '/docs/care')
})
await check('C347', 'Unicode and separator portable identities round-trip', () => {
  for (const value of ['Über/庭','docs:key/one','normal']) assert.equal(portable.decodePortableIdentitySegment(portable.encodePortableIdentitySegment(value)), value)
  assert.throws(() => portable.decodePortableIdentitySegment('%not-encoding'))
})
await check('C271 C278', 'YAML/JSON records and canonical incremental SHA-256', async () => {
  const value = { title: 'Über', nested: { enabled: false, count: 2 } }
  assert.deepEqual(portable.parsePortableYaml(portable.serializePortableYaml(value)), value)
  assert.deepEqual(portable.parsePortableJson(JSON.stringify(value)), value)
  assert.equal(await cms.hashCanonicalJson({ b: 2, a: 1 }), await cms.hashCanonicalJson({ a: 1, b: 2 }))
  const bytes = new TextEncoder().encode('abc')
  const incremental = new cms.IncrementalSha256(); incremental.update(bytes.slice(0,1)); incremental.update(bytes.slice(1))
  assert.equal(incremental.digestHex(), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
await check('C272', 'portable MDC classification serialization and normalization', async () => {
  const source = '# Safe\n\nText **bold**.'
  const ast = await portable.parsePortableMdc(source, policy)
  const serialized = await portable.serializePortableMdc(ast, policy)
  assert.equal(await portable.portableMdcSemanticallyEqual(source, serialized, policy), true)
  assert.equal(portable.normalizePortableMdcSource('Text\n\n'), 'Text')
  assert.ok(await portable.classifyPortableMdc(source, policy))
})
const authored = JSON.parse(await readFile('server/store/authored.json','utf8'))
const documents = authored.filter(d => !d.draft).map(d => portable.validatePortableDocument({
  format: 'ginko-content-document', version: 1, collection: d.collection, canonicalKey: d.canonicalKey, locale: d.locale,
  slug: d.contentPath.split('/').at(-1), parentCanonicalKey: null, order: null,
  shared: d.collection === 'products' ? { title: d.title, price: d.price } : { title: d.title, description: d.description },
  localized: d.collection === 'docs' ? { category: d.category } : {}, body: { kind: 'mdc', source: d.mdc }, visibility: { navigation: true, search: true, sitemap: true }
}, contract))
await check('C273 C277', 'document codecs validate identity and semantic model equality', async () => {
  for (const d of documents) {
    const text = await portable.serializePortableDocument(d, contract)
    const parsed = await portable.parsePortableDocument(text, contract)
    assert.equal(parsed.canonicalKey, d.canonicalKey)
    assert.match(portable.portableDocumentPath(parsed, contract), /\.md$/)
    assert.equal(await portable.portableModelsSemanticallyEqual({ documents: [parsed], assets: [] }, { documents: [parsed], assets: [] }), true)
    assert.throws(() => portable.validatePortableDocument({ ...d, locale: 'invalid-locale' }, contract))
  }
})
await check('C274 C275', 'portable relations and managed asset fields collect validate and remap', async () => {
  const relationContract = cms.buildResolvedContentContract({ collections: {
    records: defineCollection({ type: 'data', schema: fields.object({ name: fields.text().required(), related: fields.relation('records'), image: fields.image() }) })
  } }, { defaultLocale:'en', locales:['en'] })
  const make = (key, shared) => portable.validatePortableDocument({ format:'ginko-content-document',version:1,collection:'records',canonicalKey:key,locale:'en',slug:'',parentCanonicalKey:null,order:null,shared,localized:{},body:null,visibility:{navigation:false,search:false,sitemap:false} },relationContract)
  const target = make('target',{ name:'Target' })
  const reference = { collection:'records',canonicalKey:'target' }
  const image = { kind:'external',url:'https://example.com/image.png' }
  const entry = make('entry',{ name:'Entry',related:reference,image })
  const metadataFields = relationContract.collections.records.fields
  assert.deepEqual(portable.collectPortableReferences(metadataFields,entry.shared),[reference])
  portable.validatePortableReferences([target,entry],relationContract)
  assert.throws(() => portable.validatePortableReferences([entry],relationContract))
  assert.deepEqual(portable.collectPortableAssetReferences(metadataFields,entry.shared),[image])
  const remapped = portable.rewritePortableAssetReferences(metadataFields,entry.shared,() => ({ kind:'external',url:'https://example.com/new.png' }))
  assert.equal(remapped.image.url,'https://example.com/new.png')
  await portable.validatePortableAssets([target,entry],relationContract,[])
})
await check('C276', 'portable directory round-trip validates and rebuilds manifests', async () => {
  const parent = await mkdtemp(resolve(evidence, 'portable-'))
  const dest = resolve(parent,'catalog')
  await io.writePortableDirectory(dest, { contract, documents, assets: [] })
  const bundle = await io.readPortableDirectory(dest)
  assert.equal(bundle.documents.length, 4)
  await io.verifyPortableDirectoryBounded(dest)
  const rebuilt = await io.rebuildPortableDirectoryManifest(dest)
  assert.deepEqual(rebuilt, bundle.manifest)
  assert.deepEqual(portable.parsePortableManifest(portable.serializePortableManifest(rebuilt)), rebuilt)
})
// Exercise the actual docs-site unchanged. Never add locales, remove drafts,
// rewrite links or replace failed input to make the export green.
let assessment
await check('K303', 'filesystem assessment loads an ordinary Nuxt configuration', async () => {
  assessment = await io.assessFilesystemPortability({ rootDir: resolve('../docs-site') })
  await writeFile(resolve(evidence,'docs-site-assessment.json'), JSON.stringify(assessment,null,2)+'\n')
  assert.ok(!assessment.diagnostics.some(d => d.code === 'CONTRACT_INVALID'), JSON.stringify(assessment.diagnostics))
})
await check('K302', 'unlocalized defaults export without locale contract failure (D-03)', async () => {
  const probe = await io.assessFilesystemPortability({ rootDir: resolve('test/fixtures/unlocalized') })
  await writeFile(resolve(evidence,'unlocalized-assessment.json'), JSON.stringify(probe,null,2)+'\n')
  assert.ok(!probe.diagnostics.some(d => d.code === 'CONTRACT_INVALID'), JSON.stringify(probe.diagnostics))
})
await check('X303', 'export the unchanged docs-site with input hash guard', async () => {
  const parent = await mkdtemp(resolve(evidence,'docs-export-'))
  const exported = await io.exportFilesystemToPortableDirectory({ rootDir: resolve('../docs-site'), destination: resolve(parent,'docs-site'), expectedInputHash: assessment?.evidence?.inputHash })
  assert.ok(exported.documents > 0)
  const verified = await io.readPortableDirectory(exported.directory)
  assert.equal(verified.documents.length, exported.documents)
  await io.rebuildPortableDirectoryManifest(exported.directory)
})
await writeFile(resolve(evidence,'scripts.json'), JSON.stringify(checks,null,2)+'\n')
console.log(JSON.stringify({ passed: checks.filter(c=>c.status==='pass').length, failed: checks.filter(c=>c.status==='fail').map(c=>({ check:c.check,error:c.errors[0] })) },null,2))
process.exitCode = checks.some(c=>c.status==='fail') ? 1 : 0
