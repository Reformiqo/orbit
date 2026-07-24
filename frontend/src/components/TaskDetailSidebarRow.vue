<template>
  <div class="flex items-center gap-2 py-1.5">
    <div
      class="flex w-28 flex-shrink-0 items-center gap-1.5 text-sm text-ink-gray-6"
    >
      <component :is="icon" v-if="icon" class="h-3.5 w-3.5" />
      <span>{{ label }}</span>
    </div>
    <div class="flex-1 min-w-0">
      <slot>
        <span class="text-sm text-ink-gray-5">—</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  icon: { type: [Object, Function], default: null },
})
</script>
