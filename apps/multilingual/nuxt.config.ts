export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content', '@nuxtjs/i18n', '@nuxtjs/sitemap'],
  site: { url: 'https://ginko-demo-multilingual.vercel.app' },
  i18n: {
    locales: [{ code: 'en', language: 'en-US' }, { code: 'de', language: 'de-DE' }, { code: 'ja', language: 'ja-JP' }],
    defaultLocale: 'en', strategy: 'prefix_except_default', detectBrowserLanguage: false,
    customRoutes: 'config',
    pages: { 'guides-slug': { en: '/guides/[...slug]', de: '/leitfaden/[...slug]', ja: '/gaido/[...slug]' }, 'pricing-plan': { en: '/pricing/[plan]', de: '/preise/[plan]', ja: '/ryokin/[plan]' } }
  },
  content: {
    i18n: { translatedSlugs: true, fallback: { de: ['en'], ja: ['de', 'en'] } },
    search: { engine: 'pagefind' }, sitemap: true,
    links: { main: { pricing: { route: 'pricing-plan', params: { plan: 'team' }, query: { ref: 'docs' } } } }
  }
})
