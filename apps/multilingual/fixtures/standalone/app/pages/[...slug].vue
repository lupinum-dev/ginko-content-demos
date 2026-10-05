<script setup lang="ts">
import { docs, plain, local } from '~~/content.config'
const route = useRoute()
const handle = route.path.includes('/docs') ? docs : route.path.includes('/local') ? local : plain
const { page, status } = await useContentPage(handle)
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Missing fixture' })
</script>
<template><ContentRenderer v-if="page" :value="page" /></template>
