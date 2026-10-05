<script setup lang="ts">
import { useContentSearch } from '@lupinum/ginko-content/client'
const { query, results, pending, error, activeIndex, next, previous, select, reset } = await useContentSearch({ limit: 8 })
const opened = ref(false)
function target(result: (typeof results.value)[number]) {
  return result.anchor && !result.path.includes('#') ? `${result.path}#${result.anchor}` : result.path
}
async function follow(index?: number) {
  const result = select(index)
  if (result) {
    opened.value = false
    await navigateTo(target(result))
  }
}
function close() { opened.value = false; reset() }
</script>
<template>
  <section aria-label="Search documentation" data-testid="search">
    <label for="docs-search">Search documentation</label>
    <input id="docs-search" v-model="query" role="combobox" aria-autocomplete="list" aria-controls="docs-search-results"
      :aria-expanded="opened" :aria-activedescendant="opened && results[activeIndex] ? `docs-search-option-${activeIndex}` : undefined"
      data-testid="search-input" @focus="opened = true" @input="opened = true"
      @keydown.down.prevent="opened = true; next()" @keydown.up.prevent="previous()" @keydown.enter.prevent="follow()" @keydown.esc.prevent="close()">
    <p v-if="pending" role="status" data-testid="search-pending">Loading search…</p>
    <p v-if="error" role="alert" data-testid="search-error">{{ String(error) }}</p>
    <div v-show="opened">
      <ul id="docs-search-results" role="listbox" aria-label="Search results">
        <li v-for="(result, index) in results" :id="`docs-search-option-${index}`" :key="`${result.path}:${index}`"
          role="option" :aria-selected="index === activeIndex" data-testid="search-result" :data-collection="result.collection">
          <NuxtLink :to="target(result)" @click="opened = false">{{ result.title }}</NuxtLink>
          <p data-testid="search-snippet">{{ result.excerpt }}</p>
        </li>
      </ul>
      <p v-if="query && !pending && !error && !results.length" role="status" data-testid="search-empty">No results.</p>
    </div>
  </section>
</template>
