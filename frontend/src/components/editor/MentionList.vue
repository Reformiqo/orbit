<template>
  <div
    v-if="items.length"
    class="orbit-mention-list z-50 min-w-[220px] overflow-hidden rounded-md border border-outline-gray-2 bg-surface-white p-1 text-sm shadow-lg"
    data-testid="mention-list"
  >
    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      :class="[
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-ink-gray-8 transition-colors',
        index === selectedIndex
          ? 'bg-surface-gray-3'
          : 'hover:bg-surface-gray-2',
      ]"
      data-testid="mention-list-item"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index"
    >
      <span
        class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-3 text-[10px] font-semibold uppercase text-ink-gray-7"
        :style="avatarStyle(item)"
      >
        {{ initials(item) }}
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="truncate font-medium text-ink-gray-9">
          {{ item.label }}
        </span>
        <span class="truncate text-xs text-ink-gray-5">{{ item.id }}</span>
      </span>
    </button>
  </div>
  <div
    v-else
    class="orbit-mention-list z-50 min-w-[220px] rounded-md border border-outline-gray-2 bg-surface-white p-3 text-xs text-ink-gray-5 shadow-lg"
    data-testid="mention-list-empty"
  >
    No users found
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  command: { type: Function, required: true },
})

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

function selectItem(index) {
  const item = props.items[index]
  if (!item) return
  props.command({ id: item.id, label: item.label })
}

function initials(item) {
  const label = item.label || item.id || ''
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatarStyle(item) {
  if (!item.image) return {}
  return {
    backgroundImage: `url('${item.image}')`,
    backgroundSize: 'cover',
    color: 'transparent',
  }
}

function onKeyDown({ event }) {
  if (!props.items.length) return false
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value =
      (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>
