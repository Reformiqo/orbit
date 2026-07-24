<template>
  <div class="flex h-full w-full flex-col">
    <!-- Project header -->
    <header class="border-b border-outline-gray-1 px-5 pt-3">
      <div class="flex items-center gap-2">
        <button
          class="text-sm text-ink-gray-5 hover:text-ink-gray-9"
          @click="$router.push({ name: 'Projects' })"
        >
          Projects
        </button>
        <span class="text-sm text-ink-gray-5">/</span>
        <div class="flex items-center gap-2">
          <FolderClosed class="h-4 w-4 text-ink-gray-7" />
          <h1 class="text-base font-medium text-ink-gray-9">
            {{ project?.project_name || projectId }}
          </h1>
          <code
            v-if="project?.orbit_identifier"
            class="rounded bg-surface-gray-2 px-1.5 py-0.5 text-xs text-ink-gray-7"
          >
            {{ project.orbit_identifier }}
          </code>
        </div>
      </div>

      <!-- Tab strip -->
      <nav class="mt-3 flex gap-1" data-testid="project-tabs">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="{
            name: 'ProjectDetail',
            params: { projectId, tab: tab.key },
          }"
          :replace="true"
          v-slot="{ isExactActive }"
          custom
        >
          <button
            class="relative px-3 pb-2 pt-1 text-sm transition-colors"
            :class="
              isTabActive(tab.key)
                ? 'text-ink-gray-9'
                : 'text-ink-gray-5 hover:text-ink-gray-8'
            "
            @click="$router.replace({ name: 'ProjectDetail', params: { projectId, tab: tab.key } })"
          >
            {{ tab.label }}
            <span
              v-if="isTabActive(tab.key)"
              class="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-ink-gray-9"
            />
          </button>
        </RouterLink>
      </nav>
    </header>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto">
      <div
        v-if="loading"
        class="flex h-full items-center justify-center text-sm text-ink-gray-5"
      >
        Loading project…
      </div>
      <Placeholder
        v-else-if="!project"
        :icon="FolderKanban"
        title="Project not found"
        subtitle="It may have been deleted or you don't have access."
      />
      <OverviewTab
        v-else-if="activeTab === 'overview'"
        :projectId="projectId"
      />
      <ProjectTasksTab
        v-else-if="activeTab === 'tasks'"
        :projectId="projectId"
        :projectName="project?.project_name || ''"
      />
      <ModulesTab
        v-else-if="activeTab === 'modules'"
        :projectId="projectId"
      />
      <MilestonesTab
        v-else-if="activeTab === 'milestones'"
        :projectId="projectId"
      />
      <ViewsTab
        v-else-if="activeTab === 'views'"
        :projectId="projectId"
      />
      <ProjectPagesTab
        v-else-if="activeTab === 'pages'"
        :projectId="projectId"
      />
      <SettingsTab
        v-else-if="activeTab === 'settings'"
        :projectId="projectId"
        :project="project"
        @updated="onSettingsUpdated"
      />
      <div v-else class="p-5">
        <Placeholder
          :icon="currentTabIcon"
          :title="currentTabLabel"
          :subtitle="currentTabDescription"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResource } from 'frappe-ui'
import Placeholder from '@/pages/Placeholder.vue'
import ProjectTasksTab from '@/components/ProjectTasksTab.vue'
import ProjectPagesTab from '@/components/ProjectPagesTab.vue'
import OverviewTab from '@/components/project/OverviewTab.vue'
import ModulesTab from '@/components/project/ModulesTab.vue'
import MilestonesTab from '@/components/project/MilestonesTab.vue'
import ViewsTab from '@/components/project/ViewsTab.vue'
import SettingsTab from '@/components/project/SettingsTab.vue'
import FolderClosed from '~icons/lucide/folder-closed'
import FolderKanban from '~icons/lucide/folder-kanban'
import LayoutDashboard from '~icons/lucide/layout-dashboard'
import CheckSquare from '~icons/lucide/check-square'
import Package from '~icons/lucide/package'
import Target from '~icons/lucide/target'
import Eye from '~icons/lucide/eye'
import FileText from '~icons/lucide/file-text'
import Settings from '~icons/lucide/settings'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId)
const activeTab = computed(() => route.params.tab || 'overview')

const tabs = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Project summary, recent activity, and progress.' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Stacked grouped list of tasks in this project.' },
  { key: 'modules', label: 'Modules', icon: Package, description: 'Group tasks into feature buckets.' },
  { key: 'milestones', label: 'Milestones', icon: Target, description: 'Goal-based checkpoints with optional target dates.' },
  { key: 'views', label: 'Views', icon: Eye, description: 'Saved filters shared with your team.' },
  { key: 'pages', label: 'Pages', icon: FileText, description: 'Rich-text wiki for your project.' },
  { key: 'settings', label: 'Settings', icon: Settings, description: 'Project configuration.' },
]

function isTabActive(key) {
  return activeTab.value === key
}

const currentTab = computed(
  () => tabs.find((t) => t.key === activeTab.value) || tabs[0],
)
const currentTabLabel = computed(() => currentTab.value.label)
const currentTabIcon = computed(() => currentTab.value.icon)
const currentTabDescription = computed(() => currentTab.value.description)

// Load the project
const projectResource = createResource({
  url: 'frappe.client.get',
  auto: false,
  transform: (data) => data,
})

function load() {
  if (!projectId.value) return
  projectResource.update({
    params: { doctype: 'Project', name: projectId.value },
  })
  projectResource.fetch()
}

watch(projectId, load, { immediate: true })

const project = computed(() => projectResource.data)
const loading = computed(() => projectResource.loading && !projectResource.data)

function onSettingsUpdated() {
  // Re-fetch the project so the header + other tabs pick up new values.
  projectResource.fetch()
}
</script>
