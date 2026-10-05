<script setup lang="ts">
import { paginate, count } from '@lupinum/ginko-content/client'
import { posts } from '~~/content.config'
const route = useRoute()
const pageNumber = computed(() => Math.max(1, Number.parseInt(String(route.query.page || 1), 10) || 1))
const filter = computed(() => String(route.query.filter || 'all'))
const where = computed(() => filter.value === 'nature' ? { tags: { $contains: 'nature' } } : filter.value === 'short' ? { rank: { $gt: 2, $lt: 10 } } : filter.value === 'recent' ? { date: { $gt: '2026-09-20', $lt: '2026-10-01' } } : filter.value === 'review' ? { status: { $in: ['review'] as const } } : filter.value === 'either' ? { $or: [{ rank: 1 }, { rank: 30 }] } : filter.value === 'not-review' ? { $not: { status: 'review' as const } } : {})
const { data: result } = await useAsyncData(() => `blog:${pageNumber.value}:${filter.value}`, () => paginate(posts, { mode: 'offset', page: pageNumber.value, limit: 10, sort: { publishedAt: 'desc' }, where: where.value, select: ['title', 'summary', 'publishedAt', 'rank'] }), { watch: [pageNumber, filter] })
const { data: total } = await useAsyncData('total', () => count(posts))
</script>
<template><main><h1>Field notes</h1><p data-testid="total">{{ total }} published notes</p><nav aria-label="Filters"><NuxtLink v-for="value in ['all', 'nature', 'short', 'recent', 'review', 'either', 'not-review']" :key="value" :to="{ query: { filter: value } }">{{ value }} </NuxtLink></nav><article v-for="post in result?.data" :key="post.canonicalKey" data-testid="post-card"><h2><NuxtLink :to="post.route.resolvedPath">{{ post.title }}</NuxtLink></h2><p>{{ post.summary }}</p><p>Rank {{ post.rank }}</p></article><nav aria-label="Pagination"><NuxtLink v-if="result?.mode === 'offset' && result.hasPrevious" :to="{ query: { filter, page: result.previousPage } }">Previous page</NuxtLink> <NuxtLink v-if="result?.mode === 'offset' && result.hasNext" :to="{ query: { filter, page: result.nextPage } }">Next page</NuxtLink></nav><pre data-testid="pagination">{{ JSON.stringify(result) }}</pre></main></template>
