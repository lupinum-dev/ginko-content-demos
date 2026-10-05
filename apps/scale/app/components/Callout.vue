<script setup lang="ts">defineProps<{ title: string }>()</script>
<template><aside data-testid="callout"><strong>{{ title }}</strong><slot /></aside></template>
