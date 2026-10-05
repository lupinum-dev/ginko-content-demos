<script setup lang="ts">
import { navigation, surround, one, extractContentToc } from '@lupinum/ginko-content/client'
import { findFirstNavigationPage, findFirstNavigationChild, findNavigationTrail, navigationItemContainsPath, normalizeNavigationPath, walkNavigationTree } from '@lupinum/ginko-content/navigation'
import ContentBodyRenderer from '@lupinum/ginko-content/body-renderer'
import { parseMdcBody } from '@lupinum/ginko-content/cms-contract'
import { h } from 'vue'
import { docs } from '~~/content.config'
const { data: tree } = await useAsyncData('inspect-navigation', () => navigation(docs, { select: ['description', 'icon', 'sidebar'] }))
const { data: filtered } = await useAsyncData('inspect-filtered', () => navigation(docs, { where: { category: 'start' }, sort: { order: 'desc' }, select: ['description'] }))
const { data: excerptPage } = await useAsyncData('inspect-excerpt', () => one(docs, { by: { route: '/docs/guides' } }))
const { data: neighbors } = await useAsyncData('inspect-surround', async () => {
  const routes = ['/docs/start', '/docs/start/installation', '/docs/reference/limits']
  return Promise.all(routes.map(route => surround(docs, { by: { route }, select: ['description'] })))
})
const helperFacts = computed(() => {
  const items = tree.value ?? []
  const paths: string[] = []
  walkNavigationTree(items, item => { if (item.path) paths.push(item.path) })
  const pruned: string[] = []
  walkNavigationTree(items, item => { if (item.path) pruned.push(item.path); return false })
  const group = items.find(item => item.children?.some(child => !child.path))?.children?.find(child => !child.path)
  return {
    first: findFirstNavigationPage(items)?.path,
    child: findFirstNavigationChild(items[0])?.path,
    groupChild: findFirstNavigationChild(group)?.path,
    trail: findNavigationTrail(items, '/docs/reference/group/storage').map(item => item.title),
    missingTrail: findNavigationTrail(items, '/missing'),
    contains: items.map(item => navigationItemContainsPath(item, '/docs/start/installation')),
    missingContains: items.map(item => navigationItemContainsPath(item, '/missing')),
    normalized: normalizeNavigationPath('/docs/start/installation/'),
    paths, pruned
  }
})
const { body } = await parseMdcBody('## Preview\n\nRead **formatted text**.', { autoClose: false })
const inline = ref('Read **release notes**. <!-- INLINE_COMMENT_SENTINEL -->')
const strongOverride = { strong: (_props: unknown, { slots }: { slots: { default?: () => ReturnType<typeof h>[] } }) => h('mark', { 'data-testid': 'inline-strong' }, slots.default?.()) }
const inlineTable = '| Left | Right |\n| :--- | ---: |\n| A | B |\n\n- [x] Ready\n\n> [!NOTE]\n> Safe baseline'
const tocSource = '## Intro\n\n### Details\n\n## Intro\n\n```md\n## Code heading\n```'
const extracted = extractContentToc(tocSource, { depth: 3, title: 'Extracted contents', searchDepth: 3 })
</script>
<template><main><h1>Rendering examples</h1>
<section><h2>Navigation helpers</h2><pre data-testid="helpers">{{ JSON.stringify(helperFacts) }}</pre><h3>Filtered descending start section</h3><nav data-testid="filtered-navigation"><NavigationBranch :items="filtered ?? []" /></nav><pre data-testid="neighbors">{{ JSON.stringify(neighbors) }}</pre></section>
<section><h2>Excerpt</h2><ContentRenderer v-if="excerptPage" :value="excerptPage" excerpt tag="section" id="excerpt-wrapper" class="excerpt-example" data-testid="excerpt" /></section>
<section><h2>Wrapper and unwrapping</h2><ContentRenderer v-if="excerptPage" :value="excerptPage" tag="section" :prose="false" id="custom-wrapper" class="wrapper-example" data-testid="wrapper" /><ContentRendererInline value="Unwrapped **text**." tag="div" unwrap="p" data-testid="unwrap" /></section>
<section><h2>Inline Markdown</h2><ContentRendererInline :value="inline" :components="strongOverride" data-testid="inline" /><button data-testid="edit-inline" @click="inline = 'Updated **release notes**.'">Update inline text</button><ContentRendererInline :value="inlineTable" tag="div" :unwrap="false" data-testid="inline-table" />
<ContentRendererInline value="Line one
Line two

Math $x^2$ remains plain." data-testid="inline-profile" /></section>
<section><h2>Body preview</h2><ContentBodyRenderer :body="body" :policy="{ components: {} }" :components="{}" data-testid="body-preview" /></section>
<section><h2>Extracted table of contents</h2><pre data-testid="extracted-toc">{{ JSON.stringify(extracted) }}</pre><ContentRendererInline :value="tocSource" tag="div" :unwrap="false" data-testid="toc-preview" /></section>
</main></template>
