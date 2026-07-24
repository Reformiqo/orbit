<template>
  <div class="w-full px-10 py-8" data-testid="project-overview">
    <!-- Stat tiles -->
    <div
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="overview-stats"
    >
      <AnalyticsStatTile
        label="Total tasks"
        :value="stats.total"
        :icon="ListChecks"
        test-id="overview-stat-total"
      />
      <AnalyticsStatTile
        label="Open"
        :value="stats.open"
        :icon="Circle"
        test-id="overview-stat-open"
      />
      <AnalyticsStatTile
        label="Done"
        :value="stats.done"
        :icon="CheckCircle2"
        test-id="overview-stat-done"
      />
      <AnalyticsStatTile
        label="Overdue"
        :value="stats.overdue"
        :icon="AlertTriangle"
        test-id="overview-stat-overdue"
      />
    </div>

    <!-- Chart + recent list -->
    <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AnalyticsChartCard
        title="Tasks by state"
        subtitle="Across workflow states"
        :empty="!byState.series[0]?.data.some((v) => v > 0)"
        empty-label="No tasks yet"
        test-id="overview-chart-state"
      >
        <div class="h-[260px]">
          <AxisChart :config="stateAxisConfig" />
        </div>
      </AnalyticsChartCard>

      <section
        class="flex flex-col rounded-md border border-outline-gray-1 bg-surface-white"
        data-testid="overview-recent"
      >
        <header
          class="flex items-center justify-between border-b border-outline-gray-1 px-4 py-2.5"
        >
          <div class="flex items-center gap-2">
            <FileClock class="h-4 w-4 text-ink-gray-7" />
            <h3 class="text-sm font-medium text-ink-gray-9">Recent tasks</h3>
          </div>
          <RouterLink
            :to="{ name: 'ProjectDetail', params: { projectId, tab: 'tasks' } }"
            class="text-xs text-ink-gray-6 hover:text-ink-gray-9 hover:underline"
            data-testid="overview-view-all"
          >
            View all tasks →
          </RouterLink>
        </header>
        <ul
          v-if="recentTasks.length"
          class="divide-y divide-outline-gray-1"
        >
          <li
            v-for="t in recentTasks"
            :key="t.name"
            class="flex items-center gap-2 px-4 py-2.5"
          >
            <code class="flex-shrink-0 text-xs font-medium text-ink-gray-5">
              {{ t.orbit_display_id || shortId(t.name) }}
            </code>
            <span class="flex-1 truncate text-sm text-ink-gray-8">
              {{ t.subject }}
            </span>
            <span
              v-if="stateFor(t)"
              class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-outline-gray-2 px-2 py-0.5 text-xs text-ink-gray-7"
            >
              <span
                class="h-2 w-2 rounded-full"
                :style="{ backgroundColor: stateFor(t)?.color || '#94A3B8' }"
              />
              {{ stateFor(t)?.state_name }}
            </span>
          </li>
        </ul>
        <div
          v-else
          class="flex h-40 items-center justify-center text-sm text-ink-gray-5"
        >
          No tasks yet.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AxisChart } from 'frappe-ui'
import ListChecks from '~icons/lucide/list-checks'
import Circle from '~icons/lucide/circle'
import CheckCircle2 from '~icons/lucide/check-circle-2'
import AlertTriangle from '~icons/lucide/alert-triangle'
import FileClock from '~icons/lucide/file-clock'
import AnalyticsStatTile from '@/components/AnalyticsStatTile.vue'
import AnalyticsChartCard from '@/components/AnalyticsChartCard.vue'
import { useTasksForProject } from '@/stores/tasks'
import { useWorkflowStatesForProject } from '@/stores/workflowStates'

const props = defineProps({
  projectId: { type: String, required: true },
})

const tasks = useTasksForProject(props.projectId)
const states = useWorkflowStatesForProject(props.projectId)

const stateMap = computed(() => {
  const m = new Map()
  for (const s of states.data || []) m.set(s.name, s)
  return m
})

function stateFor(t) {
  return stateMap.value.get(t.orbit_workflow_state)
}

function statusGroup(t) {
  return stateMap.value.get(t.orbit_workflow_state)?.status_group || ''
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

const stats = computed(() => {
  const rows = tasks.data || []
  let open = 0
  let done = 0
  let overdue = 0
  const today = startOfDay(new Date())
  for (const t of rows) {
    const g = statusGroup(t)
    if (g === 'Completed') done++
    else if (g !== 'Cancelled') {
      open++
      const d = parseDate(t.exp_end_date)
      if (d && startOfDay(d) < today) overdue++
    }
  }
  return { total: rows.length, open, done, overdue }
})

// Horizontal bar of tasks by state — honors state order + colors.
const byState = computed(() => {
  const labels = []
  const data = []
  const colors = []
  for (const s of states.data || []) {
    labels.push(s.state_name)
    data.push(
      (tasks.data || []).filter((t) => t.orbit_workflow_state === s.name)
        .length,
    )
    colors.push(s.color || '#94A3B8')
  }
  return {
    labels,
    series: [{ name: 'Tasks', data }],
    colors,
  }
})

const stateAxisConfig = computed(() => ({
  data: byState.value.labels.map((label, i) => ({
    state: label,
    count: byState.value.series[0].data[i],
  })),
  xAxis: { key: 'state', type: 'category' },
  yAxis: { title: 'Tasks' },
  series: [{ name: 'count', type: 'bar' }],
  colors: byState.value.colors,
  swapAxes: true,
}))

const recentTasks = computed(() =>
  [...(tasks.data || [])]
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 10),
)

function shortId(n) {
  return n ? `…${n.slice(-6)}` : ''
}
</script>
