<script setup lang="ts">
import { createError, useSeoMeta } from '#imports'
import { pages } from '~~/content.config'

definePageMeta({ key: route => route.path })

const { page, status } = await useContentPage(pages)

if (status.value === 'not-found') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true
  })
}

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description
})
</script>

<template>
  <main v-if="page">
    <ContentRenderer :value="page" />
  </main>
</template>
