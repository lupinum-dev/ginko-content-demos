<script setup lang="ts">
import { many, navigation, querySiteData, useContentSearch } from '@lupinum/ginko-content/client'
import { products, docs } from '~~/content.config'
const { data: catalog } = await useAsyncData('catalog', () => many(products, { sort: { price: 'asc' }, limit: 10 }))
const { data: nav } = await useAsyncData('docs-nav', () => navigation(docs))
const { data: site } = await useAsyncData('site', () => querySiteData('site'))
const search = await useContentSearch({ limit: 10 })
const term = ref('')
</script>
<template><main><h1>Ginko product catalog</h1><p data-testid="site-data">{{ site?.data }}</p><ul data-testid="products"><li v-for="product in catalog" :key="product.id"><NuxtLink :to="product.route.resolvedPath">{{ product.title }}</NuxtLink> — €{{ product.price }}</li></ul><nav data-testid="navigation"><NuxtLink v-for="item in nav" :key="item.path" :to="item.path!">{{ item.title }} </NuxtLink></nav><form @submit.prevent="search.setQuery(term)"><label>Search catalog <input v-model="term" data-testid="search-input"></label><button>Search</button></form><p v-if="search.error.value">{{ search.error.value }}</p><ul data-testid="search-results"><li v-for="hit in search.results.value" :key="hit.path"><NuxtLink :to="hit.path">{{ hit.title }}</NuxtLink><p>{{ hit.excerpt }}</p></li></ul></main></template>
