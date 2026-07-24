<template>
  <div class="p-6">
    <!-- Overview -->
    <h2 class="mb-3 text-lg font-medium text-ink-gray-9">Overview</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <AnalyticsStatTile
        label="Tasks created"
        :value="counts.created"
        :icon="FilePlus"
      />
      <AnalyticsStatTile
        label="Tasks assigned"
        :value="counts.assigned"
        :icon="UserCheck"
      />
      <AnalyticsStatTile
        label="Completed by you"
        :value="counts.completed"
        :icon="CheckCircle2"
      />
    </div>

    <!-- Workload -->
    <h2 class="mb-3 mt-7 text-lg font-medium text-ink-gray-9">Workload</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <WorkloadTile
        v-for="b in workload"
        :key="b.group"
        :label="b.group"
        :value="b.count"
        :color="b.color"
      />
    </div>

    <!-- Charts -->
    <div class="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-md border border-outline-gray-1 bg-surface-white p-5">
        <h3 class="text-base font-medium text-ink-gray-9">Tasks by Priority</h3>
        <div v-if="priorityChart.total" class="mt-3 h-[240px]">
          <AxisChart :config="priorityAxisConfig" />
        </div>
        <p v-else class="mt-8 text-center text-base text-ink-gray-5">
          No priority data yet.
        </p>
      </div>
      <div class="rounded-md border border-outline-gray-1 bg-surface-white p-5">
        <h3 class="text-base font-medium text-ink-gray-9">Tasks by State</h3>
        <div v-if="stateChart.total" class="mt-3 h-[240px]">
          <DonutChart :config="stateDonutConfig" />
        </div>
        <p v-else class="mt-8 text-center text-base text-ink-gray-5">
          No state data yet.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AxisChart, DonutChart } from 'frappe-ui'
import FilePlus from '~icons/lucide/file-plus'
import UserCheck from '~icons/lucide/user-check'
import CheckCircle2 from '~icons/lucide/check-circle-2'
import AnalyticsStatTile from '@/components/AnalyticsStatTile.vue'
import WorkloadTile from '@/components/mytasks/WorkloadTile.vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  states: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  currentUser: { type: String, default: '' },
})

function parseAssign(raw) {
  if (!raw) return []
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

const stateMap = computed(() => {
  const m = new Map()
  for (const s of props.states) m.set(s.name, s)
  return m
})

const myTasks = computed(() =>
  props.tasks.filter((t) => parseAssign(t._assign).includes(props.currentUser)),
)

const counts = computed(() => {
  const me = props.currentUser
  let created = 0
  let assigned = 0
  let completed = 0
  for (const t of props.tasks) {
    if (t.orbit_reporter === me || t.owner === me) created++
    const isMine = parseAssign(t._assign).includes(me)
    if (isMine) {
      assigned++
      const s = stateMap.value.get(t.orbit_workflow_state)
      if (s?.status_group === 'Completed') completed++
    }
  }
  return { created, assigned, completed }
})

const WORKLOAD_GROUPS = [
  { group: 'Backlog', color: '#94A3B8' },
  { group: 'Unstarted', color: '#64748B' },
  { group: 'Started', color: '#F59E0B' },
  { group: 'Completed', color: '#10B981' },
  { group: 'Cancelled', color: '#EF4444' },
]

const workload = computed(() => {
  const counts = new Map()
  for (const { group } of WORKLOAD_GROUPS) counts.set(group, 0)
  for (const t of myTasks.value) {
    const s = stateMap.value.get(t.orbit_workflow_state)
    const g = s?.status_group
    if (g && counts.has(g)) counts.set(g, counts.get(g) + 1)
  }
  return WORKLOAD_GROUPS.map((b) => ({ ...b, count: counts.get(b.group) || 0 }))
})

// Priority chart
const priorityChart = computed(() => {
  const order = ['Urgent', 'High', 'Medium', 'Low', 'None']
  const map = new Map(order.map((k) => [k, 0]))
  for (const t of myTasks.value) {
    const p = t.priority || 'None'
    map.set(p, (map.get(p) || 0) + 1)
  }
  const labels = order
  const data = labels.map((l) => map.get(l) || 0)
  return {
    labels,
    series: [{ name: 'Tasks', data }],
    total: data.reduce((a, b) => a + b, 0),
  }
})

const priorityAxisConfig = computed(() => ({
  data: priorityChart.value.labels.map((label, i) => ({
    priority: label,
    count: priorityChart.value.series[0].data[i],
  })),
  xAxis: { key: 'priority', type: 'category' },
  yAxis: { title: 'Tasks' },
  series: [{ name: 'count', type: 'bar' }],
  colors: ['#2563EB'],
  swapAxes: true,
}))

// State chart
const stateChart = computed(() => {
  const map = new Map()
  for (const t of myTasks.value) {
    const s = stateMap.value.get(t.orbit_workflow_state)
    const key = s ? s.state_name : 'No state'
    map.set(key, (map.get(key) || 0) + 1)
  }
  const labels = Array.from(map.keys())
  const series = Array.from(map.values())
  return { labels, series, total: series.reduce((a, b) => a + b, 0) }
})

const stateDonutConfig = computed(() => {
  const palette = [
    '#94A3B8',
    '#64748B',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#8B5CF6',
    '#2563EB',
  ]
  return {
    data: stateChart.value.labels.map((label, i) => ({
      state: label,
      count: stateChart.value.series[i],
    })),
    categoryColumn: 'state',
    valueColumn: 'count',
    colors: palette.slice(0, stateChart.value.labels.length),
  }
})
</script>
