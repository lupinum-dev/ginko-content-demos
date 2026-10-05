<script setup lang="ts">
import { many, one, querySiteData, paginate, resolveOne, backlinks, navigation, surround } from '@lupinum/ginko-content/client'
import { posts, authors } from '~~/content.config'
const { data: facts } = await useAsyncData('facts', async () => ({
  resolved: await resolveOne(posts, { by: { ref: 'post:01' }, select: ['title'] }),
  cursor: await paginate(posts, { mode: 'cursor', limit: 3, sort: { title: 'asc' } }),
  backlinks: await backlinks(authors, { by: { ref: 'author:ada' }, from: posts, select: ['title'], sort: { title: 'asc' } }),
  tree: await navigation(posts, { select: ['derivedLabel'], sort: { title: 'asc' } }),
  neighbors: await surround(posts, { by: { ref: 'post:01' } }),
  settings: await many('settings')
}))
const client = ref<unknown>(null)
const site = ref<unknown>(null)
async function populate() { client.value = await one(posts, { by: { ref: 'post:01' }, select: ['title'], populate: { author: authors } }) }
async function siteData() { try { site.value = await querySiteData('site') } catch (error) { site.value = String(error) } }
</script>
<template><main><h1>API examples</h1><pre data-testid="facts">{{ JSON.stringify(facts) }}</pre><button data-testid="populate" @click="populate">Load populated post in browser</button><pre data-testid="client">{{ JSON.stringify(client) }}</pre><button data-testid="site-data" @click="siteData">Read provider site data</button><pre data-testid="site-data-result">{{ JSON.stringify(site) }}</pre></main></template>
