<script setup lang="ts">
defineOptions({ name: 'NavigationBranch' })
type Item = { title: string; path?: string; children?: Item[] }
defineProps<{ items: Item[] }>()
</script>
<template><ul><li v-for="(item, index) in items" :key="item.path ?? `group:${index}`"><NuxtLink v-if="item.path" :to="item.path">{{ item.title }}</NuxtLink><span v-else>{{ item.title }}</span><NavigationBranch v-if="item.children?.length" :items="item.children" /></li></ul></template>
