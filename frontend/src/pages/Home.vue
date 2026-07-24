<template>
  <div class="flex h-full w-full flex-col">
    <!-- Header -->
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-6 py-3"
    >
      <div class="flex items-center gap-2">
        <HomeIcon class="h-5 w-5 text-ink-gray-7" />
        <h1 class="text-lg font-medium text-ink-gray-9">Home</h1>
      </div>
      <span
        v-if="greetingName"
        class="text-sm text-ink-gray-6"
        data-testid="home-greeting"
      >
        Good {{ daypart }}, {{ greetingName }}
      </span>
    </header>

    <div class="flex-1 overflow-auto">
      <div class="w-full px-10 py-8">
        <!-- Stat tiles -->
        <div
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          data-testid="home-stats"
        >
          <AnalyticsStatTile
            label="Assigned to you"
            :value="stats.assigned"
            :icon="UserCheck"
            test-id="home-stat-assigned"
          />
          <AnalyticsStatTile
            label="Pending"
            :value="stats.pending"
            :icon="CircleDashed"
            test-id="home-stat-pending"
          />
          <AnalyticsStatTile
            label="Completed this week"
            :value="stats.completedThisWeek"
            :icon="CheckCircle2"
            test-id="home-stat-completed"
          />
          <AnalyticsStatTile
            label="Due this week"
            :value="stats.dueThisWeek"
            :icon="CalendarDays"
            test-id="home-stat-due"
          />
        </div>

        <!-- Overdue + Upcoming -->
        <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section
            class="rounded-md border border-outline-gray-1 bg-surface-white"
            data-testid="home-overdue"
          >
            <header
              class="flex items-center justify-between border-b border-outline-gray-1 px-4 py-2.5"
            >
              <div class="flex items-center gap-2">
                <AlertTriangle class="h-4 w-4 text-ink-red-5" />
                <h2 class="text-sm font-medium text-ink-gray-9">
                  Overdue tasks
                </h2>
                <span
                  class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
                >
                  {{ overdueTasks.length }}
                </span>
              </div>
            </header>
            <ul
              v-if="overdueTasks.length"
              class="divide-y divide-outline-gray-1"
            >
              <li
                v-for="t in overdueTasks"
                :key="t.name"
                class="cursor-pointer px-4 py-2.5 transition-colors hover:bg-surface-gray-2"
                data-testid="home-overdue-row"
                @click="openTask(t)"
              >
                <div class="flex items-center gap-2">
                  <code
                    class="flex-shrink-0 text-xs font-medium text-ink-gray-5"
                  >
                    {{ t.orbit_display_id || shortId(t.name) }}
                  </code>
                  <span class="flex-1 truncate text-sm text-ink-gray-9">
                    {{ t.subject }}
                  </span>
                  <span class="flex-shrink-0 text-xs text-ink-red-5">
                    {{ formatDate(t.exp_end_date) }}
                  </span>
                </div>
                <div
                  v-if="projectMap.get(t.project)"
                  class="mt-1 text-xs text-ink-gray-5"
                >
                  {{ projectMap.get(t.project)?.project_name }}
                </div>
              </li>
            </ul>
            <div
              v-else
              class="flex h-32 items-center justify-center text-sm text-ink-gray-5"
              data-testid="home-overdue-empty"
            >
              Nothing overdue. Great job.
            </div>
          </section>

          <section
            class="rounded-md border border-outline-gray-1 bg-surface-white"
            data-testid="home-upcoming"
          >
            <header
              class="flex items-center justify-between border-b border-outline-gray-1 px-4 py-2.5"
            >
              <div class="flex items-center gap-2">
                <CalendarDays class="h-4 w-4 text-ink-gray-7" />
                <h2 class="text-sm font-medium text-ink-gray-9">
                  Due this week
                </h2>
                <span
                  class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
                >
                  {{ upcomingTasks.length }}
                </span>
              </div>
            </header>
            <ul
              v-if="upcomingTasks.length"
              class="divide-y divide-outline-gray-1"
            >
              <li
                v-for="t in upcomingTasks"
                :key="t.name"
                class="cursor-pointer px-4 py-2.5 transition-colors hover:bg-surface-gray-2"
                data-testid="home-upcoming-row"
                @click="openTask(t)"
              >
                <div class="flex items-center gap-2">
                  <code
                    class="flex-shrink-0 text-xs font-medium text-ink-gray-5"
                  >
                    {{ t.orbit_display_id || shortId(t.name) }}
                  </code>
                  <span class="flex-1 truncate text-sm text-ink-gray-9">
                    {{ t.subject }}
                  </span>
                  <span class="flex-shrink-0 text-xs text-ink-gray-6">
                    {{ formatDate(t.exp_end_date) }}
                  </span>
                </div>
                <div
                  v-if="projectMap.get(t.project)"
                  class="mt-1 text-xs text-ink-gray-5"
                >
                  {{ projectMap.get(t.project)?.project_name }}
                </div>
              </li>
            </ul>
            <div
              v-else
              class="flex h-32 items-center justify-center text-sm text-ink-gray-5"
              data-testid="home-upcoming-empty"
            >
              No tasks due in the next seven days.
            </div>
          </section>
        </div>

        <!-- Recent activity -->
        <section
          class="mt-6 rounded-md border border-outline-gray-1 bg-surface-white"
          data-testid="home-activity"
        >
          <header
            class="flex items-center justify-between border-b border-outline-gray-1 px-4 py-2.5"
          >
            <div class="flex items-center gap-2">
              <FileClock class="h-4 w-4 text-ink-gray-7" />
              <h2 class="text-sm font-medium text-ink-gray-9">
                Recent activity
              </h2>
            </div>
          </header>
          <ul
            v-if="recentActivity.length"
            class="divide-y divide-outline-gray-1"
          >
            <li
              v-for="t in recentActivity"
              :key="t.name"
              class="flex items-start gap-3 px-4 py-3"
            >
              <span
                class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
              >
                <FileClock class="h-3 w-3 text-ink-gray-6" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-ink-gray-8">
                  Updated
                  <RouterLink
                    :to="{
                      name: 'ProjectDetail',
                      params: { projectId: t.project, tab: 'tasks' },
                    }"
                    class="font-medium text-ink-gray-9 hover:underline"
                  >
                    {{ t.orbit_display_id || shortId(t.name) }}
                    {{ t.subject }}
                  </RouterLink>
                </p>
                <p class="mt-0.5 text-xs text-ink-gray-5">
                  {{ timeAgo(t.modified) }}
                  <span v-if="projectMap.get(t.project)">
                    · {{ projectMap.get(t.project)?.project_name }}
                  </span>
                </p>
              </div>
            </li>
          </ul>
          <div
            v-else
            class="flex h-28 items-center justify-center text-sm text-ink-gray-5"
            data-testid="home-activity-empty"
          >
            No recent activity yet. Tasks you're involved in will show up here.
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import HomeIcon from '~icons/lucide/home'
import UserCheck from '~icons/lucide/user-check'
import CircleDashed from '~icons/lucide/circle-dashed'
import CheckCircle2 from '~icons/lucide/check-circle-2'
import CalendarDays from '~icons/lucide/calendar-days'
import AlertTriangle from '~icons/lucide/alert-triangle'
import FileClock from '~icons/lucide/file-clock'
import AnalyticsStatTile from '@/components/AnalyticsStatTile.vue'
import { useAllTasks } from '@/stores/allTasks'
import { useAllWorkflowStates } from '@/stores/allWorkflowStates'
import { useProjectsStore } from '@/stores/projects'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const tasks = useAllTasks()
const states = useAllWorkflowStates()
const { projects } = useProjectsStore()
const session = useSessionStore()

const greetingName = computed(() => {
  const full = session.fullName
  if (!full || full === 'User') return ''
  return full.split(' ')[0]
})

const daypart = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})

// ------- helpers -------

function parseAssign(raw) {
  if (!raw) return []
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function parseDate(value) {
  if (!value) return null
  const iso = typeof value === 'string' ? value.replace(' ', 'T') : value
  const d = new Date(iso)
  return Number.isNaN(+d) ? null : d
}

function startOfDay(d) {
  const nd = new Date(d)
  nd.setHours(0, 0, 0, 0)
  return nd
}

const stateMap = computed(() => {
  const m = new Map()
  for (const s of states.data || []) m.set(s.name, s)
  return m
})

const projectMap = computed(() => {
  const m = new Map()
  for (const p of projects.data || []) m.set(p.name, p)
  return m
})

const myTasks = computed(() =>
  (tasks.data || []).filter(
    (t) =>
      parseAssign(t._assign).includes(session.user) ||
      t.orbit_reporter === session.user ||
      t.owner === session.user,
  ),
)

const assignedTasks = computed(() =>
  (tasks.data || []).filter((t) =>
    parseAssign(t._assign).includes(session.user),
  ),
)

function statusGroup(t) {
  return stateMap.value.get(t.orbit_workflow_state)?.status_group || ''
}

function isCompleted(t) {
  return statusGroup(t) === 'Completed'
}

function isCancelled(t) {
  return statusGroup(t) === 'Cancelled'
}

function isOpen(t) {
  const g = statusGroup(t)
  return g !== 'Completed' && g !== 'Cancelled'
}

// ------- stats -------

const stats = computed(() => {
  const today = startOfDay(new Date())
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  // Start of the current week = last Monday (ISO week)
  const startOfWeek = new Date(today)
  const dow = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - dow)

  let assigned = 0
  let pending = 0
  let completed = 0
  let due = 0

  for (const t of assignedTasks.value) {
    assigned++
    if (isOpen(t)) pending++
    if (isCompleted(t)) {
      const mod = parseDate(t.modified)
      if (mod && mod >= startOfWeek) completed++
    }
    const d = parseDate(t.exp_end_date)
    if (d && isOpen(t)) {
      const dd = startOfDay(d)
      if (dd >= today && dd < weekEnd) due++
    }
  }
  return {
    assigned,
    pending,
    completedThisWeek: completed,
    dueThisWeek: due,
  }
})

// ------- overdue -------

const overdueTasks = computed(() => {
  const today = startOfDay(new Date())
  return assignedTasks.value
    .filter((t) => {
      if (!isOpen(t)) return false
      const d = parseDate(t.exp_end_date)
      return d && startOfDay(d) < today
    })
    .sort(
      (a, b) =>
        new Date(a.exp_end_date.replace(' ', 'T')) -
        new Date(b.exp_end_date.replace(' ', 'T')),
    )
    .slice(0, 10)
})

const upcomingTasks = computed(() => {
  const today = startOfDay(new Date())
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  return assignedTasks.value
    .filter((t) => {
      if (!isOpen(t)) return false
      const d = parseDate(t.exp_end_date)
      if (!d) return false
      const dd = startOfDay(d)
      return dd >= today && dd < weekEnd
    })
    .sort(
      (a, b) =>
        new Date(a.exp_end_date.replace(' ', 'T')) -
        new Date(b.exp_end_date.replace(' ', 'T')),
    )
    .slice(0, 10)
})

const recentActivity = computed(() =>
  [...myTasks.value]
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 10),
)

// ------- formatting -------

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function shortId(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function openTask(t) {
  if (!t?.project) return
  // If it looks like a TASK-... name we can open the full detail page, else
  // fall back to the project tasks list.
  if (t.name && /^TASK-/.test(t.name)) {
    router.push({
      name: 'TaskDetail',
      params: { projectId: t.project, taskId: t.name },
    })
  } else {
    router.push({
      name: 'ProjectDetail',
      params: { projectId: t.project, tab: 'tasks' },
    })
  }
}
</script>
