import { defineCollection, defineContentConfig, defineAgentSection, fields, reference } from '@lupinum/ginko-content/config'
import { z } from 'zod'
export const fieldSchemas = {
  title: fields.text().label('Title').help('Post heading').required(),
  summary: fields.textarea().required(), rich: fields.richtext().required(),
  slug: fields.slug({ from: 'title' }).required(), email: fields.email().required(), url: fields.url().required(),
  rank: fields.number().required(), featured: fields.boolean().required(),
  date: fields.date().required(), publishedAt: fields.datetime().required(),
  status: fields.select(['published', 'review']).required(), extra: fields.json().required(),
  icon: fields.icon().required(), details: fields.object({ note: fields.text().required(), secret: fields.text().required() }),
  tags: fields.array(fields.text()).required(), image: fields.image().required(),
  author: fields.relation('authors').required(), categories: fields.relations('categories').required()
}
export const authors = defineCollection({ type: 'data', source: { include: ['authors/*.yml', 'authors/**/*.yml'], exclude: 'authors/excluded/**' }, schema: z.object({ name: fields.text().required(), bio: fields.textarea(), favorite: reference('posts') }) })
export const categories = defineCollection({ type: 'data', source: 'categories/*.json', schema: z.object({ title: fields.text().required() }) })
export const posts = defineCollection({
  type: 'page', source: 'blog/**/*.md', route: '/blog',
  schema: z.object({ ...fieldSchemas, related: z.array(reference('posts')).default([]), derivedLabel: z.string().optional() }),
  agent: { section: 'blog', markdown: true }
})
export const tables = defineCollection({ type: 'data', source: 'tables/*.csv' })
export const json5 = defineCollection({ type: 'data', source: 'json5/*.json5' })
export const settings = defineCollection({ type: 'data', source: 'settings/*.json' })
export const legacy = defineCollection({ type: 'data', source: 'legacy/*.json', strict: false, schema: z.object({ title: z.string(), favorite: reference('posts').optional(), related: z.array(reference('posts')).optional() }) })
export default defineContentConfig({
  collections: { posts, authors, categories, tables, json5, settings, legacy },
  agent: {
    site: { title: 'Field notes', description: 'Thirty notes about sustainable web work.', whenToUse: 'Read the blog demo and its public API examples.' },
    sections: [defineAgentSection({ id: 'blog', title: 'Blog' })]
  }
})
