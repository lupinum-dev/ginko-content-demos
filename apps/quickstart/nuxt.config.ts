export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content'],
  site: { url: 'https://ginko-demo-quickstart.vercel.app' },
  content: { agent: { delivery: 'runtime' } }
})
