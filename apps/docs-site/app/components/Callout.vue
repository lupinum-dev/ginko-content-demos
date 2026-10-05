<script setup lang="ts">
defineProps<{ title: string; tone?: string }>()
const slots = useSlots()
</script>
<template><aside data-testid="callout" :data-tone="tone ?? 'info'"><strong>{{ title }}</strong><div><slot /></div><footer v-if="slots.actions" data-testid="actions"><slot name="actions" /></footer></aside></template>
