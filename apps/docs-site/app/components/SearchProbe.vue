<script setup lang="ts">
import { useContentSearch } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
const props = defineProps<{ collection?: boolean }>()
const initialQuery = ref('Installation')
const limit = ref(8)
const locale = ref<string | undefined>()
const search = await useContentSearch({ initialQuery, limit, locale, ...(props.collection ? { collection: docs } : {}) })
const selected = ref<ReturnType<typeof search.select>>(null)
const state = computed(() => ({ query: search.query.value, results: search.results.value, pending: search.pending.value, error: search.error.value ? String(search.error.value) : null, activeIndex: search.activeIndex.value, activeResult: search.activeResult.value, files: search.files.value, searchNavigation: search.searchNavigation.value, hasQuery: search.hasQuery.value, hasResults: search.hasResults.value, isEmpty: search.isEmpty.value, selected: selected.value }))
</script>
<template><main><h1>Search API examples</h1>
<label>Initial query at creation <input :value="initialQuery" readonly data-testid="probe-initial"></label>
<label>Query <input v-model="search.query.value" data-testid="probe-query"></label>
<label>Limit <input v-model.number="limit" type="number" min="1" data-testid="probe-limit"></label>
<label>Locale <select v-model="locale" data-testid="probe-locale"><option :value="undefined">All</option><option value="en">English</option><option value="de">German</option></select></label>
<button data-testid="probe-next" @click="search.next()">Next</button><button data-testid="probe-previous" @click="search.previous()">Previous</button>
<button data-testid="probe-select" @click="selected = search.select()">Select without navigating</button><button data-testid="probe-reset" @click="search.reset()">Reset</button>
<pre data-testid="probe-state">{{ JSON.stringify(state, null, 2) }}</pre>
</main></template>
