<template>
  <div
    class="flex h-full w-full items-center justify-center px-5 py-12"
    :data-testid="testId"
  >
    <div class="max-w-md text-center">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-gray-2"
      >
        <component :is="icon" v-if="icon" class="h-7 w-7 text-ink-gray-6" />
      </div>
      <h2 class="mt-4 text-lg font-medium text-ink-gray-9">{{ title }}</h2>
      <p class="mt-2 text-sm text-ink-gray-6">{{ description }}</p>
      <div v-if="ctaLabel" class="mt-5">
        <span class="group inline-flex" :title="ctaTooltip || ''">
          <Button
            variant="solid"
            :disabled="ctaDisabled"
            class="!bg-ink-gray-9 !text-white hover:!bg-ink-gray-8 disabled:!bg-surface-gray-3 disabled:!text-ink-gray-5"
            @click="$emit('cta')"
          >
            <template v-if="ctaIcon" #prefix>
              <component :is="ctaIcon" class="h-4 w-4" />
            </template>
            {{ ctaLabel }}
          </Button>
        </span>
        <p v-if="ctaTooltip" class="mt-2 text-xs text-ink-gray-5">
          {{ ctaTooltip }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Button } from 'frappe-ui'

defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
  ctaIcon: { type: [Object, Function], default: null },
  ctaDisabled: { type: Boolean, default: false },
  ctaTooltip: { type: String, default: '' },
  testId: { type: String, default: '' },
})

defineEmits(['cta'])
</script>
