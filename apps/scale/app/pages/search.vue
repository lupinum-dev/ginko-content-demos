<script setup lang="ts">
import { useContentSearch } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
const { locale } = useI18n()
const { query, results, pending, error } = await useContentSearch({ collection: docs, locale: () => locale.value })
</script>
<template><main><h1>MiniSearch ({{ locale }})</h1><label>Unique token <input v-model="query" data-testid="search" /></label><p data-testid="pending">{{ pending }}</p><pre data-testid="error">{{ error }}</pre><ul data-testid="results"><li v-for="hit in results" :key="hit.path"><NuxtLink :to="hit.path">{{ hit.title }}</NuxtLink><p>{{ hit.excerpt }}</p></li></ul><pre data-testid="search-state">{{ JSON.stringify(results) }}</pre></main></template>
