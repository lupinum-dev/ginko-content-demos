<script setup lang="ts">
import { one, resolveOne, many, getCollectionPath } from '@lupinum/ginko-content/client'
import { defineCollection } from '@lupinum/ginko-content/config'
import { docs, guides } from '~~/content.config'
const { locale } = useI18n()
const { data: facts } = await useAsyncData(`inspect-${locale.value}`, async () => {
  const [exact, chain, defaultOnly, ordered, populated, canonical, mounted, translated, notLocale] = await Promise.all([
    resolveOne(docs, { by: { path: '/english-only' }, locale: 'de', fallback: false }),
    resolveOne(docs, { by: { ref: 'docs:chain' }, locale: 'ja', fallback: true }),
    resolveOne(docs, { by: { ref: 'docs:chain' }, locale: 'ja', fallback: 'default' }),
    resolveOne(docs, { by: { ref: 'docs:chain' }, locale: 'ja', fallback: ['en', 'de'] }),
    one(docs, { by: { ref: 'docs:intro' }, locale: locale.value, select: ['title'], populate: { author: docs } }),
    one(docs, { by: { path: '/intro' }, locale: 'de' }),
    one(docs, { by: { route: '/de/docs/intro' }, locale: 'de' }),
    Promise.all(['en', 'de', 'ja'].map(locale => one(guides, { by: { ref: 'guide:start' }, locale }))),
    many(docs, { locale: 'de', where: { $not: { locale: 'de' } } })
  ])
  const local = defineCollection({ type: 'page', route: { en: '/docs', de: '/dokumentation', ja: '/gaido' }, i18n: { locales: ['en', 'de', 'ja'], defaultLocale: 'en' } })
  let inheritedError = ''
  try { getCollectionPath(docs, { locale: 'de', slug: 'intro' }) } catch (error) { inheritedError = String(error) }
  return { exact, chain, defaultOnly, ordered, populated, canonical, mounted, translated, notLocale,
    paths: { slug: getCollectionPath(local, { locale: 'de', slug: 'intro' }), path: getCollectionPath(local, { locale: 'de', path: '/intro', slug: 'ignored' }), noPrefix: getCollectionPath(local, { locale: 'de', path: '/intro', localePrefix: false }), inheritedError } }
})
</script>
<template><h1>Public API observations</h1><pre data-testid="facts">{{ JSON.stringify(facts) }}</pre></template>
