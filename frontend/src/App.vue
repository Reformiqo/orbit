<template>
  <FrappeUIProvider>
    <DesktopLayout>
      <router-view :key="$route.fullPath" />
    </DesktopLayout>
  </FrappeUIProvider>
</template>

<script setup>
import { FrappeUIProvider, useTheme } from 'frappe-ui'
import DesktopLayout from '@/components/Layouts/DesktopLayout.vue'

const { setTheme } = useTheme()
if (!localStorage.getItem('theme')) {
  setTheme('light')
}
</script>
