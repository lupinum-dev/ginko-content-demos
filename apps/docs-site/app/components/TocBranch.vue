<script setup lang="ts">
import type { TocLink } from '@lupinum/ginko-content/client'
defineProps<{ links: TocLink[] }>()
</script>
<template><ul><li v-for="link in links" :key="link.id"><a :href="`#${link.id}`">{{ link.text }}</a><TocBranch v-if="link.children?.length" :links="link.children" /></li></ul></template>
