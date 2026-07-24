<template>
  <div
    class="flex flex-col rounded-lg border border-outline-gray-2 bg-surface-white px-5 py-4"
    :data-testid="testId"
  >
    <div class="text-base text-ink-gray-7">
      {{ label }}
    </div>
    <div class="mt-2 flex items-baseline gap-2">
      <span
        class="text-2xl font-semibold text-ink-gray-9"
        :data-testid="valueTestId"
      >
        {{ displayValue }}
      </span>
      <span
        v-if="hint"
        class="text-sm text-ink-gray-5"
      >
        {{ hint }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  hint: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  testId: { type: String, default: '' },
})

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) return '—'
  return typeof props.value === 'number'
    ? props.value.toLocaleString()
    : props.value
})

const valueTestId = computed(() =>
  props.testId ? `${props.testId}-value` : '',
)
</script>
