export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content', 'nuxt-site-config'],
  site: { url: 'https://ginko-demo-blog.vercel.app' },
  content: {
    api: { baseURL: '/api/blog-content' },
    sitemap: false,
    agent: { delivery: 'runtime' },
    csv: { delimiter: ';', json: true },
    cache: '~~/server/content-cache',
    revalidate: process.env.GINKO_CONTENT_REVALIDATE_TOKEN ? { token: process.env.GINKO_CONTENT_REVALIDATE_TOKEN, allowUnsigned: false } : false,
    preview: { token: process.env.GINKO_CONTENT_PREVIEW_TOKEN },
    transformers: ['~~/content-transformers/label']
  }
})
