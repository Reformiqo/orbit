<template>
  <div
    v-if="items.length"
    class="orbit-slash-list z-50 min-w-[260px] overflow-hidden rounded-md border border-outline-gray-2 bg-surface-white p-1 text-sm shadow-lg"
    data-testid="slash-list"
  >
    <button
      v-for="(item, index) in items"
      :key="item.key"
      type="button"
      :class="[
        'flex w-full items-center gap-3 rounded px-2 py-2 text-left text-ink-gray-8 transition-colors',
        index === selectedIndex
          ? 'bg-surface-gray-3'
          : 'hover:bg-surface-gray-2',
      ]"
      data-testid="slash-list-item"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index"
    >
      <span
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-outline-gray-2 bg-surface-white text-ink-gray-7"
      >
        <component :is="item.icon" v-if="item.icon" class="h-4 w-4" />
        <span v-else class="text-xs">/</span>
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="truncate font-medium text-ink-gray-9">
          {{ item.title }}
        </span>
        <span
          v-if="item.description"
          class="truncate text-xs text-ink-gray-5"
        >
          {{ item.description }}
        </span>
      </span>
    </button>
  </div>
  <div
    v-else
    class="orbit-slash-list z-50 min-w-[260px] rounded-md border border-outline-gray-2 bg-surface-white p-3 text-xs text-ink-gray-5 shadow-lg"
    data-testid="slash-list-empty"
  >
    No commands match
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
  props.command(item)
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
