<template>
  <div class="mb-3 last:mb-0">
    <button
      class="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm font-medium uppercase tracking-wide text-ink-gray-6 hover:bg-surface-gray-2"
      @click="open = !open"
    >
      {{ label }}
      <ChevronDown
        class="h-4 w-4 transition-transform"
        :class="{ '-rotate-90': !open }"
      />
    </button>
    <div v-show="open" class="mt-1.5 flex flex-col gap-1">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChevronDown from '~icons/lucide/chevron-down'

defineProps({
  label: { type: String, required: true },
})

const open = ref(true)
</script>
