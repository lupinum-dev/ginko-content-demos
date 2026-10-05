<script setup lang="ts">
import { navigation, useContentPage } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
definePageMeta({ key: route => route.path })
const { locale } = useI18n()
const { page, status, error, previous, next } = await useContentPage(docs, { locale: () => locale.value, surround: { select: ['description'] } })
if (status.value === 'error') throw error.value
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Document not found', fatal: true })
const { data: items } = await useAsyncData(`docs-navigation-${locale.value}`, () => navigation(docs, { locale: locale.value }))
useSeoMeta({ title: () => page.value?.title, description: () => page.value?.description })
</script>
<template><main v-if="page"><article data-testid="document"><nav aria-label="Languages"><NuxtLink v-for="alternate in page.route.alternates" :key="alternate.locale" :to="alternate.path">{{ alternate.locale }}</NuxtLink></nav><ContentRenderer :value="page" /><p data-testid="rank">Rank: {{ page.rank }}</p></article><nav aria-label="Adjacent pages"><NuxtLink v-if="previous" :to="previous.path" data-testid="previous">Previous: {{ previous.title }}</NuxtLink> <NuxtLink v-if="next" :to="next.path" data-testid="next">Next: {{ next.title }}</NuxtLink></nav><details open><summary>Documentation sidebar</summary><nav aria-label="Documentation" data-testid="sidebar"><NavigationBranch v-if="items" :items="items" /></nav></details></main></template>
