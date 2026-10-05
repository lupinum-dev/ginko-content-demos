<script setup lang="ts">
import type { ContentNavigationTreeItem } from '@lupinum/ginko-content/client'
defineOptions({ name: 'NavigationBranch' })
defineProps<{ items: ContentNavigationTreeItem[] }>()
</script>
<template><ul><li v-for="(item, index) in items" :key="item.path ?? index"><NuxtLink v-if="item.path" :to="item.path">{{ item.title }}</NuxtLink><span v-else>{{ item.title }}</span><NavigationBranch v-if="item.children?.length" :items="item.children" /></li></ul></template>
