<template>
  <FrappeUIProvider>
    <DesktopLayout>
      <router-view :key="routeKey" />
    </DesktopLayout>
  </FrappeUIProvider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FrappeUIProvider, useTheme } from 'frappe-ui'
import DesktopLayout from '@/components/Layouts/DesktopLayout.vue'

const route = useRoute()

// Remount views when the route changes — except within a single project, where
// the tab (and page) segments change but ProjectDetail reads them reactively.
// Keying it by project id keeps it mounted across tab switches, so the header
// title doesn't flash back to the project id while a needless refetch runs.
const routeKey = computed(() =>
  route.name === 'ProjectDetail'
    ? `project-${route.params.projectId}`
    : route.fullPath,
)

const { setTheme } = useTheme()
if (!localStorage.getItem('theme')) {
  setTheme('light')
}
</script>
