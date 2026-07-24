<template>
  <div class="flex h-full w-full flex-col">
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-6 py-4"
    >
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-medium text-ink-gray-9">Analytics</h1>
        <span class="text-lg text-ink-gray-5">/</span>
        <span class="text-base text-ink-gray-6">Workspace</span>
      </div>
      <div class="flex items-center gap-2 text-sm text-ink-gray-5">
        <BarChart3 class="h-4 w-4" />
        <span>Cross-project task metrics</span>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div
        v-if="loading"
        class="flex h-full items-center justify-center text-base text-ink-gray-5"
        data-testid="analytics-loading"
      >
        Loading analytics…
      </div>

      <div
        v-else-if="!tasks.data?.length"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center" data-testid="analytics-empty">
          <BarChart3 class="mx-auto h-10 w-10 text-ink-gray-5" />
          <h2 class="mt-3 text-xl font-medium text-ink-gray-9">
            No data to chart yet
          </h2>
          <p class="mt-1.5 text-base text-ink-gray-5">
            Create tasks in a project to see workspace metrics here.
          </p>
        </div>
      </div>

      <div v-else class="px-6 py-5">
        <!-- Stat tiles -->
        <div
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          data-testid="analytics-stats"
        >
          <AnalyticsStatTile
            label="Total tasks"
            :value="stats.total"
            :icon="ListChecks"
            test-id="stat-total"
          />
          <AnalyticsStatTile
            label="Open"
            :value="stats.open"
            :icon="Circle"
            test-id="stat-open"
          />
          <AnalyticsStatTile
            label="Completed"
            :value="stats.completed"
            :icon="CheckCircle2"
            test-id="stat-completed"
          />
          <AnalyticsStatTile
            label="Overdue"
            :value="stats.overdue"
            :icon="AlertTriangle"
            test-id="stat-overdue"
          />
        </div>

        <!-- Charts grid -->
        <div class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AnalyticsChartCard
            title="Tasks by status"
            subtitle="Distribution across workflow states"
            :empty="!byState.series.length"
            empty-label="No workflow states in use"
            test-id="chart-status"
          >
            <div class="h-[260px]">
              <DonutChart :config="stateDonutConfig" />
            </div>
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Tasks by priority"
            subtitle="Urgent · High · Medium · Low"
            :empty="!byPriority.total"
            empty-label="No priorities set"
            test-id="chart-priority"
          >
            <div class="h-[260px]">
              <AxisChart :config="priorityAxisConfig" />
            </div>
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Created vs. completed"
            subtitle="Last 8 weeks"
            :empty="!byWeek.hasAny"
            empty-label="Not enough history yet"
            test-id="chart-trend"
          >
            <div class="h-[260px]">
              <AxisChart :config="trendAxisConfig" />
            </div>
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Top assignees"
            subtitle="Open tasks per user, top 8"
            :empty="!topAssignees.length"
            empty-label="No assigned tasks yet"
            test-id="chart-assignees"
          >
            <div class="h-[260px]">
              <AxisChart :config="assigneeAxisConfig" />
            </div>
          </AnalyticsChartCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AxisChart, DonutChart } from 'frappe-ui'
import BarChart3 from '~icons/lucide/bar-chart-3'
import ListChecks from '~icons/lucide/list-checks'
import Circle from '~icons/lucide/circle'
import CheckCircle2 from '~icons/lucide/check-circle-2'
import AlertTriangle from '~icons/lucide/alert-triangle'
import AnalyticsStatTile from '@/components/AnalyticsStatTile.vue'
import AnalyticsChartCard from '@/components/AnalyticsChartCard.vue'
import { useAllTasks } from '@/stores/allTasks'
import { useAllWorkflowStates } from '@/stores/allWorkflowStates'

const tasks = useAllTasks()
const states = useAllWorkflowStates()

const loading = computed(
  () => (tasks.loading && !tasks.data) || (states.loading && !states.data),
)

// --- helpers ------------------------------------------------------------

const COMPLETED_GROUP = 'Completed'
const CANCELLED_GROUP = 'Cancelled'
const FALLBACK_COLOR = '#94A3B8'
const PALETTE = [
  '#2563EB', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#0EA5E9', // sky
  '#F97316', // orange
  '#14B8A6', // teal
]

const stateMap = computed(() => {
  const m = new Map()
  for (const s of states.data || []) m.set(s.name, s)
  return m
})

function parseAssign(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function taskStatusGroup(t) {
  const s = stateMap.value.get(t.orbit_workflow_state)
  return s?.status_group || ''
}

function isCompleted(t) {
  return taskStatusGroup(t) === COMPLETED_GROUP
}

function isCancelled(t) {
  return taskStatusGroup(t) === CANCELLED_GROUP
}

function isOpen(t) {
  const g = taskStatusGroup(t)
  return g !== COMPLETED_GROUP && g !== CANCELLED_GROUP
}

function parseDate(value) {
  if (!value) return null
  // Frappe Datetime / Date come as "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD"
  const iso = typeof value === 'string' ? value.replace(' ', 'T') : value
  const d = new Date(iso)
  return isNaN(+d) ? null : d
}

function startOfDay(d) {
  const nd = new Date(d)
  nd.setHours(0, 0, 0, 0)
  return nd
}

// --- stats --------------------------------------------------------------

const stats = computed(() => {
  const rows = tasks.data || []
  let completed = 0
  let open = 0
  let overdue = 0
  const today = startOfDay(new Date())
  for (const t of rows) {
    if (isCompleted(t)) {
      completed++
      continue
    }
    if (isCancelled(t)) continue
    open++
    const due = parseDate(t.exp_end_date)
    if (due && startOfDay(due) < today) overdue++
  }
  return {
    total: rows.length,
    open,
    completed,
    overdue,
  }
})

// --- chart 1: tasks by workflow state (donut) ---------------------------

const byState = computed(() => {
  // Group by state_name (collapse duplicates across projects — same label
  // across projects reads as one slice to the user).
  const counts = new Map() // label -> { count, color }
  for (const t of tasks.data || []) {
    const s = stateMap.value.get(t.orbit_workflow_state)
    const label = s?.state_name || 'No status'
    const color = s?.color || FALLBACK_COLOR
    const existing = counts.get(label)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(label, { count: 1, color })
    }
  }
  const entries = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)
  return {
    labels: entries.map(([label]) => label),
    series: entries.map(([, v]) => v.count),
    colors: entries.map(([, v]) => v.color),
  }
})

const stateDonutConfig = computed(() => ({
  data: byState.value.labels.map((label, i) => ({
    label,
    count: byState.value.series[i],
  })),
  categoryColumn: 'label',
  valueColumn: 'count',
  colors: byState.value.colors,
}))

// --- chart 2: tasks by priority (horizontal bar) ------------------------

const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low']
const PRIORITY_COLORS = ['#EF4444', '#F59E0B', '#2563EB', '#64748B']

const byPriority = computed(() => {
  const counts = Object.fromEntries(PRIORITIES.map((p) => [p, 0]))
  let total = 0
  for (const t of tasks.data || []) {
    if (t.priority && counts[t.priority] !== undefined) {
      counts[t.priority]++
      total++
    }
  }
  return { counts, total }
})

const priorityAxisConfig = computed(() => ({
  data: PRIORITIES.map((p) => ({
    priority: p,
    count: byPriority.value.counts[p],
  })),
  xAxis: { key: 'priority', type: 'category' },
  yAxis: { title: 'Tasks' },
  series: [{ name: 'count', type: 'bar' }],
  colors: PRIORITY_COLORS,
  swapAxes: true,
}))

// --- chart 3: created vs completed over last 8 weeks --------------------

const byWeek = computed(() => {
  const today = startOfDay(new Date())
  // Week buckets: 8 weeks ending with the current week (Mon-Sun each).
  const weeks = []
  const startOfWeek = new Date(today)
  // Walk back to Monday (getDay: 0=Sun, 1=Mon, ...)
  const dow = (startOfWeek.getDay() + 6) % 7 // 0 for Monday
  startOfWeek.setDate(startOfWeek.getDate() - dow)

  for (let i = 7; i >= 0; i--) {
    const start = new Date(startOfWeek)
    start.setDate(startOfWeek.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    weeks.push({ start, end, created: 0, completed: 0 })
  }

  let hasAny = false
  for (const t of tasks.data || []) {
    const created = parseDate(t.creation)
    if (created) {
      for (const w of weeks) {
        if (created >= w.start && created < w.end) {
          w.created++
          hasAny = true
          break
        }
      }
    }
    // "Completed" bucket: tasks in a completed state — use `modified` as the
    // completion timestamp proxy (we don't have a dedicated completed_at
    // field on Task yet; modified is what changed when the state flipped).
    if (isCompleted(t)) {
      const completedAt = parseDate(t.modified)
      if (completedAt) {
        for (const w of weeks) {
          if (completedAt >= w.start && completedAt < w.end) {
            w.completed++
            hasAny = true
            break
          }
        }
      }
    }
  }
  return { weeks, hasAny }
})

function formatWeekLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const trendAxisConfig = computed(() => ({
  data: byWeek.value.weeks.map((w) => ({
    week: formatWeekLabel(w.start),
    created: w.created,
    completed: w.completed,
  })),
  xAxis: { key: 'week', type: 'category' },
  yAxis: { title: 'Tasks' },
  series: [
    { name: 'created', type: 'line' },
    { name: 'completed', type: 'line' },
  ],
  colors: ['#2563EB', '#10B981'],
}))

// --- chart 4: top assignees (horizontal bar) ----------------------------

const topAssignees = computed(() => {
  const counts = new Map() // email -> count of open tasks
  for (const t of tasks.data || []) {
    if (!isOpen(t)) continue
    for (const a of parseAssign(t._assign)) {
      counts.set(a, (counts.get(a) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([email, count]) => ({ email, count }))
})

function displayNameFromEmail(email) {
  if (!email) return ''
  const local = email.split('@')[0]
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const assigneeAxisConfig = computed(() => ({
  data: topAssignees.value.map((a) => ({
    name: displayNameFromEmail(a.email),
    count: a.count,
  })),
  xAxis: { key: 'name', type: 'category' },
  yAxis: { title: 'Open tasks' },
  series: [{ name: 'count', type: 'bar' }],
  colors: PALETTE,
  swapAxes: true,
}))
</script>
