<template>
  <section
    class="flex flex-col rounded-lg border border-outline-gray-2 bg-surface-white"
    :data-testid="testId"
  >
    <header
      class="flex items-center justify-between border-b border-outline-gray-2 px-5 py-4"
    >
      <div class="flex flex-col">
        <h3 class="text-base font-medium text-ink-gray-9">{{ title }}</h3>
        <p v-if="subtitle" class="mt-0.5 text-sm text-ink-gray-5">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div class="min-h-[260px] px-3 py-4">
      <div
        v-if="empty"
        class="flex h-[240px] items-center justify-center text-base text-ink-gray-5"
      >
        {{ emptyLabel || 'No data yet' }}
      </div>
      <slot v-else />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  empty: { type: Boolean, default: false },
  emptyLabel: { type: String, default: '' },
  testId: { type: String, default: '' },
})
</script>
