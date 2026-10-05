<script setup lang="ts">
import { internal } from '~~/content.config'
const { page, status } = await useContentPage(internal)
if (status.value === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Document not found', fatal: true })
</script><template><main><ContentRenderer v-if="page" :value="page" /></main></template>
