<script setup lang="ts">
import { useContentSearch } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
const { locale } = useI18n()
const { query, results, pending, error, files, searchNavigation } = await useContentSearch({ locale: () => locale.value, collection: docs })
const all = await useContentSearch()
</script>
<template><h1>Pagefind search</h1><label>Locale search <input v-model="query" data-testid="search" /></label><p data-testid="search-pending">{{ pending }}</p><pre data-testid="search-error">{{ error }}</pre>
<ul data-testid="results"><li v-for="hit in results" :key="hit.path"><NuxtLink :to="hit.path">{{ hit.title }}</NuxtLink><span>{{ hit.locale }}</span></li></ul>
<pre data-testid="search-files">{{ JSON.stringify(files) }}</pre><pre data-testid="search-navigation">{{ JSON.stringify(searchNavigation) }}</pre>
<label>All languages <input v-model="all.query.value" data-testid="all-search" /></label><pre data-testid="all-results">{{ JSON.stringify(all.results.value) }}</pre><pre data-testid="all-error">{{ all.error.value }}</pre>
</template>
