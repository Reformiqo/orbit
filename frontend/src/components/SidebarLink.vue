<template>
  <RouterLink
    v-if="to"
    :to="to"
    custom
    v-slot="{ isActive, navigate }"
  >
    <button
      class="flex h-9 w-full cursor-pointer items-center rounded text-ink-gray-8 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
      :class="
        isActive ? 'bg-surface-selected shadow-sm' : 'hover:bg-surface-gray-2'
      "
      @click="navigate"
    >
      <div
        class="flex w-full items-center gap-2.5 px-2.5 py-2"
        :class="isCollapsed ? 'justify-center px-1' : ''"
      >
        <component
          v-if="icon"
          :is="icon"
          class="h-5 w-5 flex-shrink-0 text-ink-gray-8"
        />
        <span
          v-show="!isCollapsed"
          class="flex-1 truncate text-left text-base"
        >
          {{ label }}
        </span>
        <slot v-if="!isCollapsed" name="right" />
      </div>
    </button>
  </RouterLink>
  <button
    v-else
    class="flex h-9 w-full cursor-pointer items-center rounded text-ink-gray-8 transition-colors duration-150 hover:bg-surface-gray-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
    @click="$emit('click', $event)"
  >
    <div
      class="flex w-full items-center gap-2.5 px-2.5 py-2"
      :class="isCollapsed ? 'justify-center px-1' : ''"
    >
      <component
        v-if="icon"
        :is="icon"
        class="h-5 w-5 flex-shrink-0 text-ink-gray-8"
      />
      <span
        v-show="!isCollapsed"
        class="flex-1 truncate text-left text-base"
      >
        {{ label }}
      </span>
      <slot v-if="!isCollapsed" name="right" />
    </div>
  </button>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  icon: { type: [Object, String, Function], default: null },
  label: { type: String, default: '' },
  to: { type: [Object, String], default: null },
  isCollapsed: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>
