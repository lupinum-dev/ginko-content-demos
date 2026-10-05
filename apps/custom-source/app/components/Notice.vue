<script setup lang="ts">defineProps<{ title: string }>()</script>
<template><aside data-testid="stored-mdc"><strong>{{ title }}</strong><slot /><footer><slot name="actions" /></footer></aside></template>
