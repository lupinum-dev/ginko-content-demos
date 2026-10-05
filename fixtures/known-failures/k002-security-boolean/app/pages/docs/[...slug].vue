<script setup lang="ts">
import { docs } from '~~/content.config'
const { page, status } = await useContentPage(docs)
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Document not found', fatal: true })
// Log renderer diagnostics without intercepting or suppressing the failure.
onErrorCaptured(error => {
  console.error('KNOWN_FAILURE_RENDER_ERROR', error.message)
  const detail: unknown = JSON.parse(JSON.stringify(error))
  if (detail && typeof detail === 'object' && 'issues' in detail && Array.isArray(detail.issues)) {
    for (const issue of detail.issues) {
      if (issue && typeof issue === 'object' && 'message' in issue) console.error(String(issue.message))
    }
  }
})
</script>
<template><main><ContentRenderer v-if="page" :value="page" /></main></template>
