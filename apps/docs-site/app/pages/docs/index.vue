<script setup lang="ts">
import { navigation } from '@lupinum/ginko-content/client'
import { findFirstNavigationPage } from '@lupinum/ginko-content/navigation'
import { docs } from '~~/content.config'
const entry = findFirstNavigationPage(await navigation(docs))
if (entry?.path) await navigateTo(entry.path)
</script>
<template><p>Opening documentation…</p></template>
