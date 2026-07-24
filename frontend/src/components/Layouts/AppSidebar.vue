<template>
  <aside
    class="relative flex h-full flex-col justify-between transition-all duration-300 ease-in-out"
    :class="isCollapsed ? 'w-14' : 'w-[260px]'"
  >
    <div class="p-2.5">
      <UserDropdown :isCollapsed="isCollapsed" />
    </div>

    <div class="flex-1 overflow-y-auto px-2.5">
      <nav class="flex flex-col gap-[2px]">
        <SidebarLink
          v-for="link in navLinks"
          :key="link.label"
          :icon="link.icon"
          :label="link.label"
          :to="link.to"
          :isCollapsed="isCollapsed"
        >
          <template
            v-if="link.label === 'Inbox' && inboxBadge.count > 0"
            #right
          >
            <span
              class="rounded-full bg-surface-blue-1 px-2 py-0.5 text-xs font-medium text-ink-blue-3"
              data-testid="sidebar-inbox-badge"
            >
              {{ inboxBadge.count > 99 ? '99+' : inboxBadge.count }}
            </span>
          </template>
        </SidebarLink>
      </nav>

      <ProjectsSidebarSection
        :isCollapsed="isCollapsed"
        :projects="projects.data || []"
        @create="showCreateProject = true"
      />
    </div>

    <div class="m-2.5 flex flex-col gap-2">
      <GettingStartedCard :isCollapsed="isCollapsed" />
      <SidebarLink
        :icon="isCollapsed ? PanelLeftOpen : PanelLeftClose"
        :label="isCollapsed ? 'Expand' : 'Collapse'"
        :isCollapsed="isCollapsed"
        @click="toggleCollapsed"
      />
    </div>

    <CreateProjectDialog v-model="showCreateProject" />
  </aside>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SidebarLink from '@/components/SidebarLink.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import GettingStartedCard from '@/components/GettingStartedCard.vue'
import ProjectsSidebarSection from '@/components/ProjectsSidebarSection.vue'
import CreateProjectDialog from '@/components/CreateProjectDialog.vue'
import { useProjectsStore } from '@/stores/projects'
import { useInboxBadge } from '@/stores/inboxBadge'
import { socket } from '@/socket'

import Home from '~icons/lucide/home'
import Inbox from '~icons/lucide/inbox'
import CheckSquare from '~icons/lucide/check-square'
import BarChart3 from '~icons/lucide/bar-chart-3'
import PanelLeftClose from '~icons/lucide/panel-left-close'
import PanelLeftOpen from '~icons/lucide/panel-left-open'

const isCollapsed = ref(false)
const showCreateProject = ref(false)
const { projects } = useProjectsStore()
const inboxBadge = useInboxBadge()

function onRealtimeNotification() {
  inboxBadge.refresh()
}

onMounted(() => {
  const stored = localStorage.getItem('orbit:sidebarCollapsed')
  if (stored === 'true') isCollapsed.value = true
  inboxBadge.refresh()
  socket?.on?.('orbit:notification', onRealtimeNotification)
})

onBeforeUnmount(() => {
  socket?.off?.('orbit:notification', onRealtimeNotification)
})

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('orbit:sidebarCollapsed', String(isCollapsed.value))
}

const navLinks = [
  { label: 'Home', icon: Home, to: { name: 'Home' } },
  { label: 'Inbox', icon: Inbox, to: { name: 'Inbox' } },
  { label: 'My Tasks', icon: CheckSquare, to: { name: 'MyTasks' } },
  { label: 'Analytics', icon: BarChart3, to: { name: 'Analytics' } },
]
</script>
