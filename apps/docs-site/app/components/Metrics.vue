<script setup lang="ts">defineProps<{ label: string; count: number; enabled: boolean; options: { mode: string } }>()</script>
<template><section data-testid="metrics" :data-count="count" :data-enabled="enabled" :data-mode="options.mode"><strong>{{ label }}</strong><slot /></section></template>
