<script setup lang="ts">
import type { ContentNavigationItem } from '@lupinum/ginko-content/client'
defineOptions({ name: 'NavigationBranch' })
defineProps<{ items: ContentNavigationItem[] }>()
</script>
<template><ul><li v-for="(item, index) in items" :key="item.path ?? `group:${index}`" :data-icon="item.icon" :data-sidebar="item.sidebar">
<NuxtLink v-if="item.path" :to="item.path">{{ item.title }}</NuxtLink><span v-else data-testid="structural-group">{{ item.title }}</span>
<NavigationBranch v-if="item.children?.length" :items="item.children" /></li></ul></template>
