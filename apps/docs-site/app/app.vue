<script setup lang="ts">
import { navigation } from '@lupinum/ginko-content/client'
import { docs } from '~~/content.config'
const { data: items } = await useAsyncData('docs-navigation', () => navigation(docs, { select: ['description', 'icon', 'sidebar', 'badge'] }))
</script>
<template><header><NuxtLink to="/" data-testid="home-link">Fieldnote</NuxtLink> · <NuxtLink to="/docs" data-testid="docs-entry">Documentation</NuxtLink> · <NuxtLink to="/inspect" data-testid="inspect-link">Examples</NuxtLink></header>
<nav aria-label="Documentation" data-testid="sidebar"><NavigationBranch :items="items ?? []" /></nav><NuxtPage /></template>
<style>body { margin: 1rem; } pre { overflow-x: auto; } img, svg { max-width: 100%; } article, main { max-width: 70ch; } table { border-spacing: 1rem; } nav a { overflow-wrap: anywhere; }</style>
