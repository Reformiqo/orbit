<template>
  <div class="flex h-full flex-col">
    <!-- Rich header -->
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-5 py-2"
    >
      <div class="flex items-center gap-2">
        <CheckSquare class="h-4 w-4 text-ink-gray-7" />
        <span class="text-sm font-medium text-ink-gray-9">Tasks</span>
        <span
          v-if="tasks.data"
          class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
        >
          {{ filteredTasks.length }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- View-type toggle group -->
        <div
          class="inline-flex items-center gap-0 rounded-md border border-outline-gray-2 p-0.5"
        >
          <button
            v-for="v in viewTypes"
            :key="v.key"
            class="flex h-6 w-6 items-center justify-center rounded transition-colors"
            :class="
              viewType === v.key
                ? 'bg-surface-gray-3 text-ink-gray-9'
                : v.disabled
                  ? 'cursor-not-allowed text-ink-gray-4'
                  : 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9'
            "
            :title="v.label + (v.disabled ? ' (coming soon)' : '')"
            :disabled="v.disabled"
            @click="!v.disabled && (viewType = v.key)"
          >
            <component :is="v.icon" class="h-3.5 w-3.5" />
          </button>
        </div>

        <span class="mx-1 h-5 w-px bg-outline-gray-2" />

        <!-- Filter: menu of dimensions to ADD -->
        <Dropdown :options="addFilterMenu" placement="bottom-end">
          <template #default>
            <button
              class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
              :class="{ '!bg-surface-gray-3': activeFilterCount }"
              data-testid="task-filter-btn"
            >
              <Filter class="h-3.5 w-3.5 text-ink-gray-6" />
              <span class="hidden sm:inline">Filter</span>
              <span
                v-if="activeFilterCount"
                class="rounded-full bg-ink-gray-9 px-1.5 py-0 text-[10px] leading-4 text-white"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </template>
        </Dropdown>

        <!-- Display: sort + group-by -->
        <Popover placement="bottom-end">
          <template #target="{ togglePopover }">
            <button
              class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
              data-testid="task-display-btn"
              @click="togglePopover"
            >
              <Sliders class="h-3.5 w-3.5 text-ink-gray-6" />
              Display
            </button>
          </template>
          <template #body>
            <div
              class="w-80 rounded-md border border-outline-gray-2 bg-surface-white p-4 shadow-lg"
            >
              <div class="mb-4">
                <div
                  class="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-gray-6"
                >
                  Sort by
                </div>
                <select
                  v-model="sort"
                  class="h-9 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                >
                  <option v-for="o in sortDefs" :key="o.key" :value="o.key">
                    {{ o.label }}
                  </option>
                </select>
              </div>
              <div>
                <div
                  class="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-gray-6"
                >
                  Group by
                </div>
                <select
                  v-model="groupBy"
                  class="h-9 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                  data-testid="task-groupby-select"
                >
                  <option v-for="o in groupByDefs" :key="o.key" :value="o.key">
                    {{ o.label }}
                  </option>
                </select>
              </div>
            </div>
          </template>
        </Popover>

        <Button
          variant="solid"
          class="ml-0.5 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
          data-testid="tasks-create-btn"
          @click="showCreate = true"
        >
          <template #prefix><Plus class="h-4 w-4" /></template>
          Add task
        </Button>
      </div>
    </header>

    <!-- Chip row: one chip per active/visible filter dimension -->
    <div
      v-if="chipsToShow.length || search"
      class="flex flex-wrap items-center gap-1.5 border-b border-outline-gray-1 px-5 py-2"
    >
      <div class="relative flex items-center">
        <Search class="absolute left-2 h-3.5 w-3.5 text-ink-gray-5" />
        <input
          v-model="search"
          type="text"
          placeholder="Search tasks…"
          class="h-7 w-48 rounded-md border border-outline-gray-2 bg-surface-white pl-7 pr-2 text-sm text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
          data-testid="task-search"
        />
      </div>

      <!-- Assignee chip -->
      <Popover
        v-if="chipsToShow.includes('assignee')"
        placement="bottom-start"
      >
        <template #target="{ togglePopover }">
          <FilterChip
            :icon="Users"
            label="Assignees"
            :value="assigneeChipLabel"
            @click="togglePopover"
            @remove="removeFilter('assignee')"
          />
        </template>
        <template #body>
          <div
            class="w-80 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
          >
            <div class="relative mb-2 flex items-center">
              <Search class="absolute left-2.5 h-3.5 w-3.5 text-ink-gray-5" />
              <input
                v-model="memberSearch"
                type="text"
                placeholder="Search members…"
                class="h-8 w-full rounded-md border border-outline-gray-2 bg-surface-white pl-8 pr-2 text-sm text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                autofocus
              />
            </div>
            <div class="max-h-80 overflow-y-auto">
              <label
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-surface-gray-2"
              >
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5"
                  :checked="filters.assignees.includes('__unassigned__')"
                  @change="toggleArrayFilter('assignees', '__unassigned__')"
                />
                <UserX class="h-4 w-4 text-ink-gray-5" />
                <span class="text-sm text-ink-gray-8">Unassigned</span>
              </label>
              <label
                v-if="session.user"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-surface-gray-2"
              >
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5"
                  :checked="filters.assignees.includes(session.user)"
                  @change="toggleArrayFilter('assignees', session.user)"
                />
                <UserAvatar
                  :email="session.user"
                  :name="session.fullName"
                  size="xs"
                />
                <span class="text-sm text-ink-gray-8">
                  Me
                  <span class="text-ink-gray-5"
                    >({{ session.fullName }})</span
                  >
                </span>
              </label>
              <div class="my-1 border-t border-outline-gray-1" />
              <label
                v-for="u in filteredMembers"
                :key="u.name"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-surface-gray-2"
              >
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5"
                  :checked="filters.assignees.includes(u.name)"
                  @change="toggleArrayFilter('assignees', u.name)"
                />
                <UserAvatar :email="u.name" :name="u.full_name" size="xs" />
                <span class="truncate text-sm text-ink-gray-8">
                  {{ u.full_name || u.name }}
                </span>
              </label>
              <p
                v-if="memberSearch && !filteredMembers.length"
                class="px-2 py-1 text-xs italic text-ink-gray-5"
              >
                No members match "{{ memberSearch }}"
              </p>
            </div>
          </div>
        </template>
      </Popover>

      <!-- Status chip -->
      <Popover
        v-if="chipsToShow.includes('status')"
        placement="bottom-start"
      >
        <template #target="{ togglePopover }">
          <FilterChip
            :icon="CircleDashed"
            label="Status"
            :value="statusChipLabel"
            @click="togglePopover"
            @remove="removeFilter('status')"
          />
        </template>
        <template #body>
          <div
            class="w-64 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
          >
            <label
              v-for="s in states.data || []"
              :key="s.name"
              class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-gray-2"
            >
              <input
                type="checkbox"
                class="h-4 w-4"
                :checked="filters.status.includes(s.name)"
                @change="toggleArrayFilter('status', s.name)"
              />
              <span
                class="h-2.5 w-2.5 rounded-full"
                :style="{ backgroundColor: s.color || '#94A3B8' }"
              />
              <span class="text-sm text-ink-gray-8">{{ s.state_name }}</span>
            </label>
          </div>
        </template>
      </Popover>

      <!-- Priority chip -->
      <Popover
        v-if="chipsToShow.includes('priority')"
        placement="bottom-start"
      >
        <template #target="{ togglePopover }">
          <FilterChip
            :icon="Signal"
            label="Priority"
            :value="priorityChipLabel"
            @click="togglePopover"
            @remove="removeFilter('priority')"
          />
        </template>
        <template #body>
          <div
            class="w-56 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
          >
            <label
              v-for="p in priorityOptions"
              :key="p"
              class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-gray-2"
            >
              <input
                type="checkbox"
                class="h-4 w-4"
                :checked="filters.priority.includes(p)"
                @change="toggleArrayFilter('priority', p)"
              />
              <span class="text-sm text-ink-gray-8">{{ p }}</span>
            </label>
          </div>
        </template>
      </Popover>

      <!-- Due date chip -->
      <Popover
        v-if="chipsToShow.includes('dueDate')"
        placement="bottom-start"
      >
        <template #target="{ togglePopover }">
          <FilterChip
            :icon="CalendarClock"
            label="Due"
            :value="dueDateChipLabel"
            @click="togglePopover"
            @remove="removeFilter('dueDate')"
          />
        </template>
        <template #body>
          <div
            class="w-56 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
          >
            <label
              v-for="opt in dueDateOptions"
              :key="opt.value"
              class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-gray-2"
            >
              <input
                type="radio"
                name="orbitDueDatePop"
                class="h-4 w-4"
                :checked="filters.dueDate === opt.value"
                @change="filters.dueDate = opt.value"
              />
              <span class="text-sm text-ink-gray-8">{{ opt.label }}</span>
            </label>
          </div>
        </template>
      </Popover>

      <!-- Quick add-filter button inline -->
      <Dropdown
        v-if="availableToAdd.length"
        :options="addFilterMenu"
        placement="bottom-start"
      >
        <template #default>
          <button
            class="inline-flex items-center gap-1 rounded-md border border-dashed border-outline-gray-2 px-2 py-0.5 text-xs text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
            data-testid="add-filter-inline"
          >
            <Plus class="h-3 w-3" />
            Filter
          </button>
        </template>
      </Dropdown>

      <button
        v-if="chipsToShow.length"
        class="text-xs text-ink-gray-6 hover:text-ink-gray-9"
        @click="clearFilters"
      >
        Clear
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-hidden">
      <div
        v-if="loading"
        class="flex h-full items-center justify-center text-sm text-ink-gray-5"
      >
        Loading tasks…
      </div>

      <div
        v-else-if="!tasks.data?.length"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center">
          <CheckSquare class="mx-auto h-8 w-8 text-ink-gray-5" />
          <h2 class="mt-3 text-lg font-medium text-ink-gray-9">No tasks yet</h2>
          <p class="mt-1 text-sm text-ink-gray-5">
            Create your first task to start tracking work.
          </p>
          <Button
            variant="solid"
            class="mt-4 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
            @click="showCreate = true"
          >
            <template #prefix><Plus class="h-4 w-4" /></template>
            Add task
          </Button>
        </div>
      </div>

      <template v-else>
        <ListView
          v-if="viewType === 'list'"
          :filteredTasks="filteredTasks"
          :states="states.data || []"
          :taskTypes="taskTypes.data || []"
          :groupBy="groupBy"
          :getState="getState"
          :getType="getType"
          @openCreate="showCreate = true"
          @openTask="openTask"
        />
        <KanbanView
          v-else-if="viewType === 'kanban'"
          :filteredTasks="filteredTasks"
          :states="states.data || []"
          :taskTypes="taskTypes.data || []"
          :getState="getState"
          :getType="getType"
          :onReload="reloadTasks"
          @openCreate="openCreateInState"
        />
        <CalendarView
          v-else-if="viewType === 'calendar'"
          :filteredTasks="filteredTasks"
          :states="states.data || []"
          :taskTypes="taskTypes.data || []"
          :getState="getState"
          :getType="getType"
          @openCreateForDate="openCreateForDate"
        />
        <SpreadsheetView
          v-else-if="viewType === 'spreadsheet'"
          :filteredTasks="filteredTasks"
          :states="states.data || []"
          :taskTypes="taskTypes.data || []"
          :getState="getState"
          :getType="getType"
          :onReload="reloadTasks"
        />
      </template>
    </div>

    <CreateTaskDialog
      v-model="showCreate"
      :projectId="projectId"
      :projectName="projectName"
      :initialState="createInitialState"
      :initialDueDate="createInitialDueDate"
    />

    <TaskDetailPanel
      v-model="showDetail"
      :task="selectedTask"
      :state="selectedTask ? getState(selectedTask) : null"
      :type="selectedTask ? getType(selectedTask) : null"
      :states="states.data || []"
      :types="taskTypes.data || []"
      :projectId="projectId"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Button, Dropdown, Popover } from 'frappe-ui'
import Plus from '~icons/lucide/plus'
import Search from '~icons/lucide/search'
import Filter from '~icons/lucide/filter'
import CheckSquare from '~icons/lucide/check-square'
import Sliders from '~icons/lucide/sliders-horizontal'
import Users from '~icons/lucide/users'
import UserX from '~icons/lucide/user-x'
import CircleDashed from '~icons/lucide/circle-dashed'
import Signal from '~icons/lucide/signal'
import CalendarClock from '~icons/lucide/calendar-clock'
import List from '~icons/lucide/list'
import LayoutGrid from '~icons/lucide/layout-grid'
import Calendar from '~icons/lucide/calendar'
import LayoutList from '~icons/lucide/layout-list'
import FilterChip from '@/components/FilterChip.vue'
import CreateTaskDialog from '@/components/CreateTaskDialog.vue'
import TaskDetailPanel from '@/components/TaskDetailPanel.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ListView from '@/components/project-tasks/ListView.vue'
import KanbanView from '@/components/project-tasks/KanbanView.vue'
import CalendarView from '@/components/project-tasks/CalendarView.vue'
import SpreadsheetView from '@/components/project-tasks/SpreadsheetView.vue'
import { useTasksForProject } from '@/stores/tasks'
import { useWorkflowStatesForProject } from '@/stores/workflowStates'
import { useTaskTypesForWorkspace } from '@/stores/taskTypes'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'
import { useSessionStore } from '@/stores/session'
import { useUsers } from '@/stores/users'

const props = defineProps({
  projectId: { type: String, required: true },
  projectName: { type: String, default: '' },
})

const states = useWorkflowStatesForProject(props.projectId)
const tasks = useTasksForProject(props.projectId)
const { currentWorkspace } = useCurrentWorkspace()
const taskTypes = useTaskTypesForWorkspace(currentWorkspace.value?.name)
const session = useSessionStore()
const users = useUsers()

const showCreate = ref(false)
const showDetail = ref(false)
const selectedTask = ref(null)
const createInitialState = ref('')
const createInitialDueDate = ref('')

function openTask(t) {
  selectedTask.value = t
  showDetail.value = true
}

function openCreateInState(stateName) {
  createInitialState.value = stateName || ''
  createInitialDueDate.value = ''
  showCreate.value = true
}

function openCreateForDate(iso) {
  createInitialState.value = ''
  createInitialDueDate.value = iso || ''
  showCreate.value = true
}

function reloadTasks() {
  return tasks.reload?.()
}

// Clear prefill when dialog closes so the next open has defaults.
watch(showCreate, (v) => {
  if (!v) {
    createInitialState.value = ''
    createInitialDueDate.value = ''
  }
})

const viewType = ref('list')
const search = ref('')
const sort = ref('modified_desc')
const groupBy = ref('none')
const memberSearch = ref('')

const filters = reactive({
  status: [],
  priority: [],
  dueDate: '',
  assignees: [],
})

// Which chips are shown: either the user opened them via "+ Filter", or they have values.
const visibleFilters = ref(new Set())

const viewTypes = [
  { key: 'list', label: 'List', icon: List, disabled: false },
  { key: 'kanban', label: 'Kanban', icon: LayoutGrid, disabled: false },
  { key: 'calendar', label: 'Calendar', icon: Calendar, disabled: false },
  { key: 'spreadsheet', label: 'Spreadsheet', icon: LayoutList, disabled: false },
]

const priorityOptions = ['Urgent', 'High', 'Medium', 'Low']
const dueDateOptions = [
  { value: '', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'this-week', label: 'Due this week' },
  { value: 'no-date', label: 'No due date' },
]

const sortDefs = [
  { key: 'modified_desc', label: 'Recently updated' },
  { key: 'modified_asc', label: 'Oldest updated' },
  { key: 'subject_asc', label: 'Title A→Z' },
  { key: 'subject_desc', label: 'Title Z→A' },
  { key: 'due_asc', label: 'Due date (earliest)' },
  { key: 'priority_desc', label: 'Priority (high→low)' },
]
const groupByDefs = [
  { key: 'none', label: 'No grouping' },
  { key: 'status', label: 'Group by status' },
  { key: 'priority', label: 'Group by priority' },
]

// ---------- derived ----------

const stateMap = computed(() => {
  const m = new Map()
  for (const s of states.data || []) m.set(s.name, s)
  return m
})

const typeMap = computed(() => {
  const m = new Map()
  for (const t of taskTypes.data || []) m.set(t.name, t)
  return m
})

function getState(t) {
  return stateMap.value.get(t.orbit_workflow_state)
}

function getType(t) {
  return typeMap.value.get(t.orbit_task_type)
}

function hasValues(key) {
  if (key === 'assignee') return filters.assignees.length > 0
  if (key === 'status') return filters.status.length > 0
  if (key === 'priority') return filters.priority.length > 0
  if (key === 'dueDate') return !!filters.dueDate
  return false
}

const chipsToShow = computed(() => {
  const out = []
  for (const k of ['assignee', 'status', 'priority', 'dueDate']) {
    if (visibleFilters.value.has(k) || hasValues(k)) out.push(k)
  }
  return out
})

const availableToAdd = computed(() =>
  ['assignee', 'status', 'priority', 'dueDate'].filter(
    (k) => !chipsToShow.value.includes(k),
  ),
)

const addFilterDefs = {
  assignee: { label: 'Assignee', icon: Users },
  status: { label: 'Status', icon: CircleDashed },
  priority: { label: 'Priority', icon: Signal },
  dueDate: { label: 'Due date', icon: CalendarClock },
}

const addFilterMenu = computed(() =>
  availableToAdd.value.map((k) => ({
    label: addFilterDefs[k].label,
    icon: addFilterDefs[k].icon,
    onClick: () => addFilter(k),
  })),
)

function addFilter(key) {
  const next = new Set(visibleFilters.value)
  next.add(key)
  visibleFilters.value = next
}

function removeFilter(key) {
  if (key === 'assignee') filters.assignees = []
  else if (key === 'status') filters.status = []
  else if (key === 'priority') filters.priority = []
  else if (key === 'dueDate') filters.dueDate = ''
  const next = new Set(visibleFilters.value)
  next.delete(key)
  visibleFilters.value = next
}

// ---------- chip labels ----------

const assigneeChipLabel = computed(() => {
  if (!filters.assignees.length) return '—'
  const labels = filters.assignees.map((a) => {
    if (a === '__unassigned__') return 'Unassigned'
    if (a === session.user) return 'Me'
    const u = (users.data || []).find((x) => x.name === a)
    return u?.full_name || a
  })
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, +${labels.length - 1}`
})

const statusChipLabel = computed(() => {
  if (!filters.status.length) return '—'
  const labels = filters.status.map(
    (s) => stateMap.value.get(s)?.state_name || s,
  )
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, +${labels.length - 1}`
})

const priorityChipLabel = computed(() => {
  if (!filters.priority.length) return '—'
  if (filters.priority.length <= 2) return filters.priority.join(', ')
  return `${filters.priority[0]}, +${filters.priority.length - 1}`
})

const dueDateChipLabel = computed(() => {
  if (!filters.dueDate) return '—'
  return (
    dueDateOptions.find((o) => o.value === filters.dueDate)?.label ||
    filters.dueDate
  )
})

// ---------- member search ----------

const filteredMembers = computed(() => {
  const pool = (users.data || []).filter((u) => u.name !== session.user)
  const q = memberSearch.value.trim().toLowerCase()
  const matched = q
    ? pool.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.full_name || '').toLowerCase().includes(q),
      )
    : pool
  return matched.slice(0, 20)
})

// ---------- filtering logic ----------

function taskAssignees(t) {
  if (!t._assign) return []
  try {
    const parsed = typeof t._assign === 'string' ? JSON.parse(t._assign) : t._assign
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function matchesAssignee(t) {
  if (!filters.assignees.length) return true
  const assignees = taskAssignees(t)
  for (const sel of filters.assignees) {
    if (sel === '__unassigned__') {
      if (assignees.length === 0) return true
    } else if (assignees.includes(sel)) {
      return true
    }
  }
  return false
}

function matchesDueDate(t) {
  const v = filters.dueDate
  if (!v) return true
  const d = t.exp_end_date ? new Date(t.exp_end_date) : null
  if (v === 'no-date') return !d
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDay = new Date(d)
  taskDay.setHours(0, 0, 0, 0)
  if (v === 'overdue') return taskDay < today
  if (v === 'today') return +taskDay === +today
  if (v === 'this-week') {
    const end = new Date(today)
    end.setDate(today.getDate() + 6)
    return taskDay >= today && taskDay <= end
  }
  return true
}

const filteredTasks = computed(() => {
  let list = [...(tasks.data || [])]
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(
      (t) =>
        t.subject?.toLowerCase().includes(q) ||
        t.orbit_display_id?.toLowerCase().includes(q),
    )
  }
  if (filters.status.length) {
    list = list.filter((t) => filters.status.includes(t.orbit_workflow_state))
  }
  if (filters.priority.length) {
    list = list.filter((t) => filters.priority.includes(t.priority))
  }
  list = list.filter(matchesAssignee)
  list = list.filter(matchesDueDate)

  const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
  list.sort((a, b) => {
    switch (sort.value) {
      case 'modified_desc':
        return new Date(b.modified) - new Date(a.modified)
      case 'modified_asc':
        return new Date(a.modified) - new Date(b.modified)
      case 'subject_asc':
        return (a.subject || '').localeCompare(b.subject || '')
      case 'subject_desc':
        return (b.subject || '').localeCompare(a.subject || '')
      case 'due_asc':
        return (
          (a.exp_end_date ? +new Date(a.exp_end_date) : Infinity) -
          (b.exp_end_date ? +new Date(b.exp_end_date) : Infinity)
        )
      case 'priority_desc':
        return (
          (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99)
        )
      default:
        return 0
    }
  })
  return list
})

const activeFilterCount = computed(() => {
  let n = 0
  n += filters.status.length
  n += filters.priority.length
  n += filters.assignees.length
  if (filters.dueDate) n += 1
  return n
})

function toggleArrayFilter(key, value) {
  const current = new Set(filters[key])
  if (current.has(value)) current.delete(value)
  else current.add(value)
  filters[key] = Array.from(current)
}

function clearFilters() {
  filters.status = []
  filters.priority = []
  filters.dueDate = ''
  filters.assignees = []
  visibleFilters.value = new Set()
}

const loading = computed(
  () => (tasks.loading && !tasks.data) || (states.loading && !states.data),
)
</script>
