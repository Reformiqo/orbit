<template>
  <div
    v-if="!isCollapsed"
    class="rounded-md border border-outline-gray-1 bg-surface-white p-4"
  >
    <div class="flex items-start gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded bg-surface-gray-2"
      >
        <Rocket class="h-4 w-4 text-ink-gray-7" />
      </div>
      <div class="flex-1">
        <div class="text-base font-medium text-ink-gray-9">Getting started</div>
        <div class="mt-0.5 text-sm text-ink-gray-5">
          {{ completed }}/{{ total }} steps
        </div>
      </div>
    </div>
    <button
      class="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded bg-surface-gray-2 px-3 py-2 text-sm font-medium text-ink-gray-8 transition-colors hover:bg-surface-gray-3"
    >
      <ChevronsRight class="h-4 w-4" />
      Start now
    </button>
  </div>
  <button
    v-else
    class="flex h-9 w-9 items-center justify-center rounded-md bg-surface-gray-2 hover:bg-surface-gray-3"
    title="Getting started"
  >
    <Rocket class="h-5 w-5 text-ink-gray-7" />
  </button>
</template>

<script setup>
import Rocket from '~icons/lucide/rocket'
import ChevronsRight from '~icons/lucide/chevrons-right'

defineProps({
  isCollapsed: { type: Boolean, default: false },
  completed: { type: Number, default: 0 },
  total: { type: Number, default: 5 },
})
</script>
