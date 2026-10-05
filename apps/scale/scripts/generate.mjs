import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const total = Number(process.env.SCALE_DOCUMENTS ?? process.argv[2] ?? 2000)
if (!Number.isInteger(total) || total < 2 || total > 2000 || total % 2) throw new Error('SCALE_DOCUMENTS must be an even integer from 2 to 2000 (both locales combined).')
const perLocale = total / 2
const root = fileURLToPath(new URL('../content/', import.meta.url))
await rm(root, { recursive: true, force: true })
const paragraphs = {
  en: [
    'Before a field survey begins, the team checks the monitoring equipment and records the condition of the site. A clear baseline helps volunteers distinguish seasonal changes from a lasting improvement. Keep the original observations with the date, location, and method so another team can repeat the measurement next year.',
    'A restoration project needs more than a list of planted species. Discuss water availability, soil structure, and local wildlife with the people who maintain the area. Small trial plots reveal which methods work before resources are committed to a larger site. Share both successful results and practical difficulties in the project notes.',
    'Review the collected data at the end of each reporting period. Unexpected values may reflect a faulty sensor, a change in weather, or an important ecological event. Compare the field notes before deciding to remove a measurement. Preserve the original record and explain each correction so future readers can understand the decision.',
    'Use a simple checklist when handing work to a new volunteer. Describe the route, the required tools, and the person to contact when access is restricted. Photographs taken from the same marked position make later comparisons easier. A short review with the local coordinator helps prevent repeated mistakes and keeps the procedure useful.',
    'Publish a concise summary for residents and project partners. Explain what was measured, how much uncertainty remains, and which action follows from the evidence. Avoid making a promise from a single observation. When the results are incomplete, plan the next visit and state which questions that visit should answer.'
  ],
  de: [
    'Vor einer Untersuchung im Gelände prüft das Team die Messgeräte und dokumentiert den Zustand des Standorts. Eine klare Ausgangslage hilft den Freiwilligen, saisonale Veränderungen von dauerhaften Verbesserungen zu unterscheiden. Bewahren Sie die ursprünglichen Beobachtungen mit Datum, Ort und Methode auf, damit ein anderes Team die Messung im nächsten Jahr wiederholen kann.',
    'Ein Renaturierungsprojekt braucht mehr als eine Liste gepflanzter Arten. Besprechen Sie Wasserverfügbarkeit, Bodenstruktur und lokale Tierwelt mit den Menschen, die das Gebiet betreuen. Kleine Versuchsflächen zeigen, welche Methoden funktionieren, bevor Ressourcen für einen größeren Standort eingesetzt werden. Teilen Sie erfolgreiche Ergebnisse und praktische Schwierigkeiten in den Projektnotizen.',
    'Prüfen Sie die gesammelten Daten am Ende jedes Berichtszeitraums. Unerwartete Werte können auf einen defekten Sensor, einen Wetterwechsel oder ein wichtiges ökologisches Ereignis hinweisen. Vergleichen Sie die Feldnotizen, bevor Sie eine Messung entfernen. Bewahren Sie den ursprünglichen Datensatz auf und erklären Sie jede Korrektur, damit spätere Leser die Entscheidung nachvollziehen können.',
    'Verwenden Sie eine einfache Checkliste, wenn neue Freiwillige die Arbeit übernehmen. Beschreiben Sie die Route, die notwendigen Werkzeuge und die Kontaktperson bei eingeschränktem Zugang. Fotos von derselben markierten Position erleichtern spätere Vergleiche. Eine kurze Rücksprache mit der lokalen Koordination verhindert wiederholte Fehler und hält das Verfahren verständlich.',
    'Veröffentlichen Sie eine kurze Zusammenfassung für Anwohner und Projektpartner. Erklären Sie, was gemessen wurde, welche Unsicherheit besteht und welche Maßnahme aus den Ergebnissen folgt. Vermeiden Sie Versprechen aus einer einzigen Beobachtung. Wenn Ergebnisse unvollständig sind, planen Sie den nächsten Besuch und benennen Sie die Fragen, die dabei beantwortet werden sollen.'
  ]
}
function pagePath(rank, locale = 'en') {
  return `${locale === 'de' ? '/de' : ''}/docs/section-${String(Math.ceil(rank / 50)).padStart(2, '0')}/page-${String(rank).padStart(4, '0')}`
}
const stats = []
for (const locale of ['en', 'de']) {
  for (let rank = 1; rank <= perLocale; rank++) {
    // Each page has its own seed, so the smaller corpora are exact prefixes.
    let state = (0x6a09e667 ^ rank) >>> 0
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
    const target = 850 + Math.floor(random() * 1000)
    const title = `${locale === 'en' ? 'Field guide' : 'Feldleitfaden'} ${String(rank).padStart(4, '0')}`
    const body = [`# ${title}`, `Unique search token: zq${String(rank).padStart(4, '0')}`, locale === 'en' ? '## Planning and monitoring' : '## Planung und Beobachtung']
    while (body.join(' ').split(/\s+/).length < target) {
      body.push(paragraphs[locale][Math.floor(random() * paragraphs[locale].length)])
      if (body.length % 8 === 0) body.push(`### ${locale === 'en' ? 'Review step' : 'Prüfschritt'} ${body.length}`)
    }
    body.push('- Record the site and date.\n- Check the equipment.\n- Share the observations.', '```ts\nconst observation = { site: "wetland", verified: true }\nconsole.log(observation)\n```', '::callout{title="Field note"}\nKeep the original evidence and explain each decision.\n::')
    if (rank % 2 === 0) body.push('::callout{title="Review"}\nDiscuss unexpected results with the local coordinator.\n::')
    body.push(`[Related page](${pagePath(rank === perLocale ? 1 : rank + 1, locale)})`, `[Section starting page](${pagePath(Math.floor((rank - 1) / 50) * 50 + 1, locale)})`)
    const section = Math.ceil(rank / 50)
    const directory = `${root}/${locale}/docs/${section}.section-${String(section).padStart(2, '0')}`
    await mkdir(directory, { recursive: true })
    const markdown = body.join('\n\n') + '\n'
    await writeFile(`${directory}/${(rank - 1) % 50 + 1}.page-${String(rank).padStart(4, '0')}.md`, `---\ntitle: ${title}\ndescription: Monitoring and restoration procedure ${rank}.\nrank: ${rank}\n---\n\n${markdown}`)
    stats.push(markdown.split(/\s+/).filter(Boolean).length)
  }
}
console.log(JSON.stringify({ seed: '0x6a09e667 XOR rank; LCG 1664525/1013904223', total, perLocale, sections: Math.ceil(perLocale / 50), words: { min: Math.min(...stats), max: Math.max(...stats) } }))
