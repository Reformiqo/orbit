<template>
  <div class="flex h-screen w-screen bg-surface-menu-bar">
    <div class="h-full border-r border-outline-gray-1 bg-surface-menu-bar">
      <AppSidebar />
    </div>
    <main class="flex flex-1 flex-col overflow-auto bg-surface-white">
      <slot />
    </main>

    <!-- App-wide modals -->
    <WorkspaceOnboardingDialog />

    <Dialog v-model="showAboutModal" :options="{ title: 'About Orbit' }">
      <template #body-content>
        <div class="space-y-3 text-base text-ink-gray-7">
          <p>
            <strong class="text-ink-gray-9">Orbit</strong> — modern project
            management built on Frappe.
          </p>
          <p>Version 0.0.1 · Licensed under MIT.</p>
        </div>
      </template>
    </Dialog>

    <Dialog v-model="showSettingsPlaceholder" :options="{ title: 'Settings' }">
      <template #body-content>
        <p class="text-base text-ink-gray-7">
          Settings page is coming soon. This placeholder confirms the dropdown
          is wired up.
        </p>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import AppSidebar from '@/components/Layouts/AppSidebar.vue'
import WorkspaceOnboardingDialog from '@/components/WorkspaceOnboardingDialog.vue'
import { Dialog } from 'frappe-ui'
import { showAboutModal, showSettingsPlaceholder } from '@/composables/modals'
</script>
