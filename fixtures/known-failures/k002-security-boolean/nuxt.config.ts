export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content'],
  content: { agent: false, sitemap: false, markdown: { plugins: ['security'] },
    componentPolicy: { components: { toggle: { kind: 'block', props: { enabled: { type: 'boolean', required: true } }, slots: ['default'], media: null } } }
  }
})
