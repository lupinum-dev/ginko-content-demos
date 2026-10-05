<script setup lang="ts">
import { navigation } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
const { data: items } = await useAsyncData('docs-navigation', () => navigation(docs, { select: ['description', 'icon', 'sidebar', 'badge'] }))
</script>
<template><header><NuxtLink to="/" data-testid="home-link">Fieldnote</NuxtLink> · <NuxtLink to="/docs" data-testid="docs-entry">Documentation</NuxtLink> · <NuxtLink to="/inspect" data-testid="inspect-link">Examples</NuxtLink></header><DocsSearch />
<nav aria-label="Documentation" data-testid="sidebar"><NavigationBranch :items="items ?? []" /></nav><NuxtPage /><footer><a href="/llms.txt" data-testid="llms-link">Agent index</a> · <a href="/llms-full.txt">Full agent content</a> · <NuxtLink to="/support">Support</NuxtLink> · <NuxtLink to="/search-probe">Search API examples</NuxtLink> · <NuxtLink to="/search-collection">Collection search examples</NuxtLink> · <NuxtLink to="/agent-paths">Agent route helpers</NuxtLink></footer></template>
<style>body { margin: 1rem; } pre { overflow-x: auto; } img, svg { max-width: 100%; } article, main { max-width: 70ch; } table { border-spacing: 1rem; } nav a { overflow-wrap: anywhere; }</style>
