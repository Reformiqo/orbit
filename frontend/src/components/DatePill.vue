<template>
  <div class="inline-block">
    <DatePicker
      :modelValue="modelValue"
      :formatter="(v) => v"
      :placeholder="placeholder"
      @update:modelValue="(v) => $emit('update:modelValue', v || '')"
    >
      <template #target="{ togglePopover, displayLabel }">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-outline-gray-2 px-3 py-1.5 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
          @click="togglePopover"
        >
          <component :is="icon" v-if="icon" class="h-4 w-4 text-ink-gray-6" />
          <span v-if="!modelValue" class="text-ink-gray-6">{{
            placeholder
          }}</span>
          <span v-else>{{ displayLabel || formatted }}</span>
        </button>
      </template>
    </DatePicker>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DatePicker } from 'frappe-ui'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Pick a date' },
  icon: { type: [Object, Function], default: null },
})
defineEmits(['update:modelValue'])

const formatted = computed(() => {
  if (!props.modelValue) return ''
  const d = new Date(props.modelValue)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})
</script>
