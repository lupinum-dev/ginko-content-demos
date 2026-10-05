<script setup lang="ts">
import { docs } from '~~/content.config'
const { page } = await useContentPage(docs)
</script>
<template><ContentRenderer v-if="page" :value="page" /></template>
