import { readFile, writeFile } from 'node:fs/promises'
import { parseMdcBody } from '@lupinum/ginko-content/cms-contract'
const source = JSON.parse(await readFile(new URL('../server/store/authored.json', import.meta.url), 'utf8'))
const published = await Promise.all(source.map(async ({ mdc, ...entry }) => ({ ...entry, ...await parseMdcBody(mdc, { autoClose: false }) })))
await writeFile(new URL('../server/store/published.json', import.meta.url), JSON.stringify(published, null, 2) + '\n')
console.log(`Published ${published.length} JSON records with the public portable parser`)
