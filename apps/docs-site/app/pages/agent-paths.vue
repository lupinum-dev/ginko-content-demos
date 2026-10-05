<script setup lang="ts">
import { agentMarkdownPathForRoute, agentRawPathForRoute, normalizeAgentRoutePath } from '@lupinum/ginko-content/agent-paths'
const examples = ['/', '/docs/start', '/de/docs/start', '/docs/start/', '/docs/start?query=1#title'].map(route => ({ route, normalized: normalizeAgentRoutePath(route), markdown: agentMarkdownPathForRoute(route), raw: agentRawPathForRoute(route) }))
</script>
<template><main><h1>Agent route helpers</h1><pre data-testid="agent-paths">{{ JSON.stringify(examples, null, 2) }}</pre></main></template>
