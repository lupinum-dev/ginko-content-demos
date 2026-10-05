<script setup lang="ts">
import { useContentPage } from '@lupinum/ginko-content/client'
import { guides } from '~~/content.config'
definePageMeta({ layout: false, key: route => route.path })
const { locale } = useI18n()
const contentPage = await useContentPage(guides, { fallback: true, locale: () => locale.value })
const { page, status, error, refresh } = contentPage
if (status.value === 'error') throw error.value
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Document not found', fatal: true })
useSeoMeta({ title: () => page.value?.title })
</script>
<template><NuxtLayout name="default" :content-page="contentPage">
  <article v-if="page" data-testid="document">
    <nav aria-label="Page languages"><NuxtLink v-for="alternate in page.route.alternates" :key="alternate.locale" :to="alternate.path" :data-testid="`page-${alternate.locale}`">{{ alternate.locale }}</NuxtLink></nav>
    <p v-if="page.resolution.usedFallback" data-testid="fallback">This page is not available in the requested language.</p>
    <ContentRenderer :value="page" />
    <NuxtLink :to="page.route.resolvedPath" data-testid="resolved-link">Resolved document</NuxtLink>
    <pre data-testid="envelope">{{ JSON.stringify({ id: page.id, canonicalKey: page.canonicalKey, locale: page.locale, route: page.route, resolution: page.resolution }) }}</pre>
  </article>
  <button data-testid="refresh" @click="refresh()">Refresh</button>
  <p data-testid="page-status">{{ status }}</p>
</NuxtLayout></template>
