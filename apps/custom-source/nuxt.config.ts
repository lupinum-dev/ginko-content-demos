export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content'],
  routeRules: { '/**': { prerender: false } },
  content: {
    agent: false,
    sitemap: false,
    search: { engine: 'provider' },
    cache: '~~/server/content-cache',
    revalidate: { token: process.env.GINKO_CONTENT_REVALIDATE_TOKEN! },
    componentPolicy: { components: {
      notice: { kind: 'block', props: { title: { type: 'string', required: true } }, slots: ['default', 'actions'], media: null }
    } }
  }
})
