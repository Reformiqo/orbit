<template>
  <div class="flex h-full w-full">
    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col w-full">
      <!-- Header -->
      <header
        class="flex items-center justify-between border-b border-outline-gray-1 px-6 pb-3 pt-5"
      >
        <div class="flex items-start gap-2">
          <UserCircle class="mt-1 h-6 w-6 text-ink-gray-7" />
          <div class="flex flex-col">
            <h1 class="text-xl font-medium text-ink-gray-9">My Tasks</h1>
            <p class="text-sm text-ink-gray-6">
              Everything assigned to you, across projects.
            </p>
          </div>
        </div>
      </header>

      <!-- Tabs (frappe-ui) -->
      <Tabs
        v-model="activeTab"
        :tabs="tabs"
        class="flex-1 overflow-hidden"
        data-testid="my-tasks-tabs"
      >
        <template #tab-panel="{ tab }">
          <div class="h-full overflow-auto">
            <SummaryTab
              v-if="tab.label === 'Summary'"
              :tasks="tasks.data || []"
              :states="states.data || []"
              :projects="projects.data || []"
              :current-user="session.user"
            />
            <TaskListTab
              v-else-if="tab.label === 'Assigned'"
              :tasks="assignedTasks"
              :states="states.data || []"
              :types="taskTypes.data || []"
              :projects="projects.data || []"
              empty-title="Nothing on your plate"
              empty-subtitle="Tasks assigned to you across all projects show up here."
            />
            <TaskListTab
              v-else-if="tab.label === 'Created'"
              :tasks="createdTasks"
              :states="states.data || []"
              :types="taskTypes.data || []"
              :projects="projects.data || []"
              empty-title="You haven't reported any tasks"
              empty-subtitle="Tasks where you're listed as the reporter show up here."
            />
            <ActivityTab
              v-else-if="tab.label === 'Activity'"
              :tasks="involvedTasks"
              :states="states.data || []"
            />
            <div v-else class="p-10 text-center text-base text-ink-gray-5">
              <p>This tab is coming soon.</p>
            </div>
          </div>
        </template>
      </Tabs>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Tabs } from 'frappe-ui'
import UserCircle from '~icons/lucide/user-circle'
import SummaryTab from '@/components/mytasks/SummaryTab.vue'
import TaskListTab from '@/components/mytasks/TaskListTab.vue'
import ActivityTab from '@/components/mytasks/ActivityTab.vue'
import { useAllTasks } from '@/stores/allTasks'
import { useAllWorkflowStates } from '@/stores/allWorkflowStates'
import { useProjectsStore } from '@/stores/projects'
import { useTaskTypesForWorkspace } from '@/stores/taskTypes'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'
import { useSessionStore } from '@/stores/session'

const tasks = useAllTasks()
const states = useAllWorkflowStates()
const { projects } = useProjectsStore()
const { currentWorkspace } = useCurrentWorkspace()
const taskTypes = useTaskTypesForWorkspace(currentWorkspace.value?.name)
const session = useSessionStore()
void projects // keep import side-effect for the store

const tabs = [
  { label: 'Summary' },
  { label: 'Assigned' },
  { label: 'Created' },
  { label: 'Subscribed' },
  { label: 'Activity' },
]
const activeTab = ref(0)

// ---------- helpers ----------

function parseAssign(raw) {
  if (!raw) return []
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

const assignedTasks = computed(() =>
  (tasks.data || []).filter((t) =>
    parseAssign(t._assign).includes(session.user),
  ),
)

function isCreator(t, me) {
  return t.orbit_reporter === me || t.owner === me
}

const createdTasks = computed(() =>
  (tasks.data || []).filter((t) => isCreator(t, session.user)),
)

const involvedTasks = computed(() => {
  const me = session.user
  return (tasks.data || []).filter(
    (t) => parseAssign(t._assign).includes(me) || isCreator(t, me),
  )
})

</script>
