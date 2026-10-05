import { collectContentCacheHint, getContentCacheHint, clearContentCacheHint, contentCacheHeaders } from '@lupinum/ginko-content/server'
export default defineEventHandler(event => {
 clearContentCacheHint(event)
 collectContentCacheHint(event, { maxAge: 300, swr: 60, etag: '"first"', tags: ['first'] })
 collectContentCacheHint(event, { maxAge: 60, swr: 30, etag: '"second"', tags: ['second'] })
 const hint = getContentCacheHint(event)
 return { hint, headers: hint ? Object.fromEntries(contentCacheHeaders(hint)) : null }
})
