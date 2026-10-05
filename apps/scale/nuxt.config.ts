export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content', '@nuxtjs/i18n', '@nuxtjs/sitemap'],
  site: { url: 'https://ginko-demo-scale.vercel.app' },
  // Measure request-time SSR, rather than serving prerendered HTML.
  routeRules: process.env.SCALE_STATIC === '1' ? {} : {
    '/docs/**': { prerender: false }, '/de/docs/**': { prerender: false },
    '/': { prerender: false }, '/de': { prerender: false },
    '/search': { prerender: false }, '/de/search': { prerender: false }
  },
  i18n: {
    locales: [{ code: 'en', language: 'en-US' }, { code: 'de', language: 'de-DE' }],
    defaultLocale: 'en', strategy: 'prefix_except_default', detectBrowserLanguage: false
  },
  content: {
    search: {}, sitemap: false,
    ...(process.env.SCALE_AGENT === 'off' ? { agent: false as const } : {}),
    componentPolicy: { components: {
      callout: { kind: 'block', props: { title: { type: 'string', required: true } }, slots: ['default'], media: null }
    } }
  }
})
