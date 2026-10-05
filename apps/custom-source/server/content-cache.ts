import { setHeader } from 'h3'
import { contentCacheHeaders } from '@lupinum/ginko-content/server'
import type { ContentCacheAdapter } from '@lupinum/ginko-content/provider'
export default {
  name: 'catalog-headers',
  apply(event, hint) {
    for (const [name, value] of contentCacheHeaders(hint)) setHeader(event, name, value)
  }
} satisfies ContentCacheAdapter
