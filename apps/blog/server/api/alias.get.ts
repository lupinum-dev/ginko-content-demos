import { one } from '@lupinum/ginko-content/server'
import { posts } from '~~/content.config'
export default defineEventHandler(async event => {
 const first = await one(event, posts, { by: { ref: 'post:01' } })
 if (!first) return { note: null }
 const original = first.details.note
 try {
  first.details.note = 'MUTATION_SENTINEL'
  const second = await one(event, posts, { by: { ref: 'post:01' } })
  return { note: second?.details.note }
 } finally {
  // Restore the fixture after observing aliasing so later requests remain independent.
  first.details.note = original
 }
})
