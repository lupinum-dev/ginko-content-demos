<script setup lang="ts">
import { posts, authors, categories } from '~~/content.config'
definePageMeta({ key: route => route.path })
const { page: post, previous, next, status, error, refresh } = await useContentPage(posts, { populate: { author: authors, categories }, surround: { select: ['description', 'publishedAt'] } })
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
if (status.value === 'error') throw error.value
useSeoMeta({ title: () => post.value?.title })
</script>
<template><main><p data-testid="status">{{ status }}</p><article v-if="post"><ContentRenderer :value="post" /><p data-testid="author">By {{ post.author?.name }}</p><ul><li v-for="category in post.categories" :key="category.canonicalKey">{{ category.title }}</li></ul><nav aria-label="Adjacent posts"><NuxtLink v-if="previous" :to="previous.path">Previous: {{ previous.title }}</NuxtLink> <NuxtLink v-if="next" :to="next.path">Next: {{ next.title }}</NuxtLink></nav><button data-testid="refresh" @click="refresh">Refresh</button></article></main></template>
