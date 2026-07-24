<template>
  <Dropdown :options="dropdownOptions" placement="bottom-start">
    <template #default="{ open }">
      <button
        class="flex h-14 items-center rounded-md py-2 transition-all duration-150"
        :class="[
          isCollapsed ? 'w-auto px-0 justify-center' : 'w-full px-2.5',
          open ? 'bg-surface-white shadow-sm' : 'hover:bg-surface-gray-3',
        ]"
      >
        <OrbitMark class="h-9 w-9 flex-shrink-0 rounded-md" />
        <div
          v-show="!isCollapsed"
          class="ml-2.5 flex flex-1 flex-col overflow-hidden text-left"
        >
          <div
            class="truncate text-base font-semibold leading-tight text-ink-gray-9"
          >
            Orbit
          </div>
          <div class="mt-1 truncate text-sm leading-none text-ink-gray-7">
            {{ session.fullName }}
          </div>
        </div>
        <FeatherIcon
          v-show="!isCollapsed"
          name="chevron-down"
          class="ml-2 size-4 text-ink-gray-5"
          aria-hidden="true"
        />
      </button>
    </template>
  </Dropdown>
</template>

<script setup>
import { computed, h, markRaw } from 'vue'
import { Dropdown, FeatherIcon } from 'frappe-ui'
import OrbitMark from '@/components/OrbitMark.vue'
import { useSessionStore } from '@/stores/session'
import { showAboutModal, showSettingsPlaceholder } from '@/composables/modals'

defineProps({
  isCollapsed: { type: Boolean, default: false },
})

const session = useSessionStore()

const dropdownOptions = computed(() => [
  {
    group: 'Main',
    hideLabel: true,
    items: [
      {
        icon: 'grid',
        label: 'Apps',
        onClick: () => (window.location.href = '/apps'),
      },
      {
        icon: 'settings',
        label: 'Settings',
        onClick: () => (showSettingsPlaceholder.value = true),
      },
      {
        icon: 'info',
        label: 'About',
        onClick: () => (showAboutModal.value = true),
      },
    ],
  },
  {
    group: 'Session',
    hideLabel: true,
    items: [
      {
        icon: 'log-out',
        label: 'Log out',
        onClick: () => session.logout(),
      },
    ],
  },
])
</script>
