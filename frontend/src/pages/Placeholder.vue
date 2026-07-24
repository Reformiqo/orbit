<template>
  <div class="flex h-full w-full items-center justify-center">
    <div class="text-center">
      <component
        v-if="icon"
        :is="icon"
        class="mx-auto h-8 w-8 text-ink-gray-5"
      />
      <h2 class="mt-3 text-lg font-medium text-ink-gray-9">{{ title }}</h2>
      <p class="mt-1 text-sm text-ink-gray-5">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  subtitle: { type: String, default: 'Coming soon.' },
})
</script>
