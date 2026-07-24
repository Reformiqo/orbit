<template>
  <div class="flex h-full flex-col" data-testid="tasks-view-calendar">
    <Calendar
      :events="events"
      :config="{ defaultMode: 'Month', disableModes: ['Day', 'Week'] }"
      :on-click="onEventClick"
      :on-cell-click="onCellClick"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from 'frappe-ui'

const router = useRouter()

const props = defineProps({
  filteredTasks: { type: Array, required: true },
  states: { type: Array, default: () => [] },
  taskTypes: { type: Array, default: () => [] },
  getState: { type: Function, required: true },
  getType: { type: Function, required: true },
})

const emit = defineEmits(['openCreateForDate'])

const events = computed(() =>
  props.filteredTasks
    .filter((t) => t.exp_end_date)
    .map((t) => {
      const date = String(t.exp_end_date).slice(0, 10)
      const state = props.getState(t)
      return {
        id: t.name,
        title: `${t.orbit_display_id ? `${t.orbit_display_id} ` : ''}${t.subject || ''}`,
        fromDate: date,
        toDate: date,
        fromTime: '09:00:00',
        toTime: '10:00:00',
        color: state?.color || '#94A3B8',
        task: t,
      }
    }),
)

function onEventClick(event) {
  const t = event?.task
  if (!t?.project || !t?.name) return
  router.push({
    name: 'TaskDetail',
    params: { projectId: t.project, taskId: t.name },
  })
}

function onCellClick(_ev, date) {
  if (!date) return
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(+d)) return
  const iso =
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  emit('openCreateForDate', iso)
}
</script>
