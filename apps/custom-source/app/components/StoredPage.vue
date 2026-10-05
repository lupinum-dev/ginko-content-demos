<script setup lang="ts">
import { useContentPage, surround } from '@lupinum/ginko-content/client'
import { docs, products } from '~~/content.config'
const props = defineProps<{ collection: 'docs' | 'products' }>()
const handle = props.collection === 'docs' ? docs : products
const { page, status } = await useContentPage(handle)
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
const { data: neighbors } = await useAsyncData(() => `neighbors:${page.value?.route.resolvedPath}`, () => surround(handle, { by: { route: page.value?.route.resolvedPath ?? '' } }))
</script>
<template><main v-if="page" data-testid="stored-page"><ContentRenderer :value="page" /><nav data-testid="surround"><template v-for="item in neighbors" :key="item?.path"><NuxtLink v-if="item" :to="item.path">{{ item.title }} </NuxtLink></template></nav></main></template>
