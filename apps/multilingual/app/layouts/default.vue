<script setup lang="ts">
import { useContentLocalePath, navigation, type ContentLocalePage } from '@lupinum/ginko-content/client'
import { docs, guides } from '~~/content.config'
const props = defineProps<{ contentPage?: ContentLocalePage }>()
const switchLocalePath = useContentLocalePath(() => props.contentPage, { fallback: useSwitchLocalePath() })
const englishPath = computed(() => switchLocalePath('en'))
const germanPath = computed(() => switchLocalePath('de'))
const japanesePath = computed(() => switchLocalePath('ja'))
const { locale } = useI18n()
const localePath = useLocalePath()
const { data: trees } = await useAsyncData(`navigation-${locale.value}`, () => Promise.all([navigation(docs, { locale: locale.value }), navigation(guides, { locale: locale.value })]).then(([docs, guides]) => ({ docs, guides })), { watch: [locale] })
</script>
<template>
<header data-testid="shared-header">
  <NuxtLink :to="localePath('/')">Home</NuxtLink> · <NuxtLink :to="localePath('/search')">Search</NuxtLink> · <NuxtLink :to="localePath('/inspect')">Inspect</NuxtLink>
  <nav aria-label="Languages">
    <NuxtLink v-if="englishPath" :to="englishPath" data-testid="header-en">English</NuxtLink><span v-else data-testid="header-en" aria-disabled="true">English</span>
    <NuxtLink v-if="germanPath" :to="germanPath" data-testid="header-de">Deutsch</NuxtLink><span v-else data-testid="header-de" aria-disabled="true">Deutsch</span>
    <NuxtLink v-if="japanesePath" :to="japanesePath" data-testid="header-ja">日本語</NuxtLink><span v-else data-testid="header-ja" aria-disabled="true">日本語</span>
  </nav>
</header>
<nav data-testid="sidebar" aria-label="Content"><NavigationBranch :items="trees?.docs ?? []" /><NavigationBranch :items="trees?.guides ?? []" /></nav>
<main><slot /></main>
</template>
