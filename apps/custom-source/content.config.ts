import { defineCollection, defineContentConfig, fields } from '@lupinum/ginko-content/config'
export const docs = defineCollection({
  type: 'page', route: '/docs',
  cms: { label: 'Catalog documentation', type: 'tree', route: { allowMultipleRoots: true }, fields: { category: { searchable: true } } },
  schema: fields.object({ title: fields.text().required(), description: fields.text(), category: fields.text().label('Category').help('Documentation group').localized().required() })
})
export const products = defineCollection({
  type: 'page', route: '/products', cms: { label: 'Products', type: 'flat' },
  schema: fields.object({ title: fields.text().required(), price: fields.number().shared().required() })
})
// Kept as authored: the contract must preserve data title and description.
export const inventory = defineCollection({ type: 'data', schema: fields.object({ title: fields.text().required(), description: fields.text().required() }) })
export default defineContentConfig({ provider: 'catalog', providers: { catalog: '~~/server/providers/catalog' }, collections: { docs, products, inventory } })
