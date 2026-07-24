<template>
  <aside
    class="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-outline-gray-1 bg-surface-menu-bar"
    data-testid="page-tree"
  >
    <header class="flex items-center justify-between px-4 py-3">
      <span class="text-sm font-medium uppercase tracking-wide text-ink-gray-6">
        Pages
      </span>
      <button
        class="flex h-7 w-7 items-center justify-center rounded text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
        title="New page"
        data-testid="page-tree-new"
        @click="$emit('create')"
      >
        <Plus class="h-4 w-4" />
      </button>
    </header>

    <div v-if="loading" class="p-4 text-sm text-ink-gray-5">Loading pages…</div>

    <div
      v-else-if="!pages.length"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center"
    >
      <FileText class="h-8 w-8 text-ink-gray-5" />
      <p class="text-sm text-ink-gray-5">No pages yet.</p>
      <button
        class="text-sm text-ink-gray-8 underline hover:text-ink-gray-9"
        data-testid="page-tree-empty-new"
        @click="$emit('create')"
      >
        Create the first page
      </button>
    </div>

    <ul v-else class="flex-1 overflow-auto pb-2">
      <PageTreeRow
        v-for="node in tree"
        :key="node.name"
        :node="node"
        :depth="0"
        :active-id="activeId"
        @select="$emit('select', $event)"
      />
    </ul>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import Plus from '~icons/lucide/plus'
import FileText from '~icons/lucide/file-text'
import PageTreeRow from '@/components/PageTreeRow.vue'

const props = defineProps({
  pages: { type: Array, required: true },
  activeId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['select', 'create'])

const tree = computed(() => {
  // Group pages by parent_page; filter out archived from tree view.
  const alive = props.pages.filter((p) => !p.is_archived)
  const byParent = new Map()
  for (const page of alive) {
    const key = page.parent_page || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(page)
  }
  // Sort each bucket by position asc, then modified desc
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      const pa = a.position ?? 0
      const pb = b.position ?? 0
      if (pa !== pb) return pa - pb
      return new Date(b.modified) - new Date(a.modified)
    })
  }
  function build(parent) {
    const kids = byParent.get(parent) || []
    return kids.map((k) => ({
      ...k,
      children: build(k.name),
    }))
  }
  return build('__root__')
})
</script>
