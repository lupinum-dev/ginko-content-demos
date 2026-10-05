<script setup lang="ts">
import { z } from 'zod'
import type { TocLink } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
definePageMeta({ key: route => route.path })
const { page, status, previous, next } = await useContentPage(docs, { surround: { select: ['description'] } })
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Document not found', fatal: true })
const linkSchema: z.ZodType<TocLink> = z.lazy(() => z.object({ id: z.string(), text: z.string(), depth: z.number(), children: z.array(linkSchema).optional() }))
const tocSchema = z.object({ links: z.array(linkSchema) })
const toc = computed(() => {
  const body = page.value?.body
  return body && typeof body === 'object' && 'toc' in body ? tocSchema.safeParse(body.toc).data : undefined
})
useSeoMeta({ title: () => page.value?.title, description: () => page.value?.description })
</script>
<template><main v-if="page"><nav aria-label="On this page" data-testid="toc"><TocBranch v-if="toc" :links="toc.links" /></nav>
<article data-testid="document"><ContentRenderer :value="page" /></article>
<nav aria-label="Adjacent pages"><NuxtLink v-if="previous" :to="previous.path" data-testid="previous">Previous: {{ previous.title }}</NuxtLink> <NuxtLink v-if="next" :to="next.path" data-testid="next">Next: {{ next.title }}</NuxtLink></nav></main></template>
