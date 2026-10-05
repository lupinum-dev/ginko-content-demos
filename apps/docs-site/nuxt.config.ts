export default defineNuxtConfig({
  modules: ['@lupinum/ginko-content', '@nuxtjs/sitemap'],
  site: { url: 'https://ginko-demo-docs-site.vercel.app' },
  css: ['katex/dist/katex.min.css'],
  content: {
    agent: false,
    ignores: ['ignored\\.md$'],
    sitemap: { include: ['docs'], exclude: ['internal'] },
    markdown: {
      plugins: ['summary', 'breaks', 'emoji', 'footnotes', 'shiki', 'math', 'mermaid', 'punctuation', ['toc', { depth: 2, searchDepth: 4 }]],
      tags: { p: 'DocsParagraph' },
      anchorLinks: { depth: 3, exclude: [1] },
      image: 'auto'
    },
    componentPolicy: { components: {
      callout: { kind: 'block', props: { title: { type: 'string', required: true }, tone: { type: 'string', required: false } }, slots: ['default', 'actions'], media: null },
      badge: { kind: 'inline', props: { label: { type: 'string', required: true } }, slots: ['default'], media: null },
      metrics: { kind: 'block', props: { label: { type: 'string', required: true }, count: { type: 'number', required: true }, enabled: { type: 'boolean', required: true }, options: { type: 'json', required: true } }, slots: ['default'], media: null }
    } }
  }
})
