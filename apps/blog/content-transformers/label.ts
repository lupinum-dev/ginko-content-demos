import { defineTransformer } from '@lupinum/ginko-content/transformers'
export default defineTransformer({
  name: 'post-label', extensions: ['.md'],
  transform(content) {
    if (typeof content.title === 'string') content.derivedLabel = `Note: ${content.title}`
    return content
  }
})
