import { getContentFieldMetadata, slugifyUrlSegment } from '@lupinum/ginko-content/config'
import { fieldSchemas } from '~~/content.config'
const good: Record<string, unknown> = {
 title: 'Note', summary: 'Line one\nLine two', rich: '**Useful**', slug: 'a-note', email: 'editor@example.com', url: 'https://example.com', rank: 2, featured: false, date: '2026-09-01', publishedAt: '2026-09-01T10:00:00+02:00', status: 'review', extra: { value: [1, true] }, icon: 'lucide:leaf', details: { note: 'Nested', secret: 'Hidden' }, tags: ['web'], image: '/leaf.png', author: 'author:ada', categories: ['category:ecology']
}
const bad: Record<string, unknown> = { title: 1, summary: 1, rich: 1, slug: 1, email: 'invalid', url: 'invalid', rank: 'two', featured: 'false', date: 'invalid', publishedAt: 'invalid', status: 'other', extra: undefined, icon: 1, details: 'invalid', tags: 'web', image: 1, author: 1, categories: [1] }
export default defineEventHandler(() => ({
 fields: Object.fromEntries(Object.entries(fieldSchemas).map(([key, schema]) => [key, { valid: schema.safeParse(good[key]), invalid: schema.safeParse(bad[key]), metadata: getContentFieldMetadata(schema) }])),
 slugs: [slugifyUrlSegment('Ä New Note'), slugifyUrlSegment('Ä New Note', { lower: false })]
}))
