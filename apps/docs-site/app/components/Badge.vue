<script setup lang="ts">defineProps<{ label: string }>()</script>
<template><span data-testid="badge">{{ label }} <slot /></span></template>
