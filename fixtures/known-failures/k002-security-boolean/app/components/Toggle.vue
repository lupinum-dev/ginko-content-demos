<script setup lang="ts">defineProps<{ enabled: boolean }>()</script>
<template><section :data-enabled="enabled"><slot /></section></template>
