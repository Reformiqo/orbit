<template>
  <li>
    <button
      class="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-base transition-colors"
      :class="
        isActive
          ? 'bg-surface-gray-3 text-ink-gray-9'
          : 'text-ink-gray-7 hover:bg-surface-gray-2 hover:text-ink-gray-9'
      "
      :style="{ paddingLeft: `${0.625 + depth * 0.9}rem` }"
      :data-testid="`page-tree-row`"
      :data-page-id="node.name"
      @click="$emit('select', node.name)"
    >
      <button
        v-if="hasChildren"
        class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-ink-gray-5 hover:text-ink-gray-9"
        @click.stop="expanded = !expanded"
      >
        <ChevronDown
          class="h-3.5 w-3.5 transition-transform"
          :class="{ '-rotate-90': !expanded }"
        />
      </button>
      <span v-else class="inline-block h-5 w-5 flex-shrink-0" />

      <span v-if="node.icon" class="flex-shrink-0 text-base leading-none">
        {{ node.icon }}
      </span>
      <FileText v-else class="h-4 w-4 flex-shrink-0 text-ink-gray-5" />

      <span class="truncate">{{ node.title || 'Untitled' }}</span>
    </button>

    <ul v-if="hasChildren && expanded">
      <PageTreeRow
        v-for="child in node.children"
        :key="child.name"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
import { computed, ref } from 'vue'
import ChevronDown from '~icons/lucide/chevron-down'
import FileText from '~icons/lucide/file-text'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  activeId: { type: String, default: '' },
})
defineEmits(['select'])

const expanded = ref(true)
const hasChildren = computed(() => (props.node.children || []).length > 0)
const isActive = computed(() => props.activeId === props.node.name)
</script>
