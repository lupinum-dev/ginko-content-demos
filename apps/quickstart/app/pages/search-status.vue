<script setup lang="ts">
import { useContentSearch } from '@lupinum/ginko-content/client'
const { error, results } = await useContentSearch({ initialQuery: 'Guide' })
</script>
<template><main><h1>Disabled search</h1><p data-testid="disabled-search-error">{{ String(error) }}</p><pre data-testid="disabled-search-results">{{ JSON.stringify(results) }}</pre></main></template>
