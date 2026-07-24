<template>
  <li
    class="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface-gray-2"
    data-testid="my-task-row"
  >
    <span
      v-if="type"
      class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white"
      :style="{ backgroundColor: type.color || '#64748B' }"
      :title="type.type_name"
    >
      {{ type.letter_prefix }}
    </span>
    <code
      class="w-24 flex-shrink-0 truncate text-sm font-medium text-ink-gray-5"
    >
      {{ task.orbit_display_id || shortName(task.name) }}
    </code>
    <RouterLink
      v-if="project"
      v-show="showProject"
      :to="{
        name: 'ProjectDetail',
        params: { projectId: task.project, tab: 'tasks' },
      }"
      class="flex-shrink-0 rounded bg-surface-gray-2 px-2 py-1 text-xs font-medium text-ink-gray-7 hover:bg-surface-gray-3"
    >
      {{ project.project_name }}
    </RouterLink>
    <span class="flex-1 truncate text-base text-ink-gray-9">
      {{ task.subject }}
    </span>
    <span
      v-if="task.priority"
      class="flex-shrink-0 rounded border border-outline-gray-2 px-2 py-1 text-xs font-medium"
      :class="priorityClass"
    >
      {{ task.priority }}
    </span>
    <span
      v-if="state"
      class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-outline-gray-2 px-3 py-1 text-sm text-ink-gray-7"
    >
      <span
        class="h-2 w-2 rounded-full"
        :style="{ backgroundColor: state.color || '#94A3B8' }"
      />
      {{ state.state_name }}
    </span>
    <span
      v-if="task.exp_end_date"
      class="flex-shrink-0 text-sm"
      :class="overdue ? 'text-ink-red-5' : 'text-ink-gray-6'"
    >
      {{ formatDate(task.exp_end_date) }}
    </span>
  </li>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: { type: Object, required: true },
  state: { type: Object, default: null },
  type: { type: Object, default: null },
  project: { type: Object, default: null },
  showProject: { type: Boolean, default: true },
})

const priorityClass = computed(() => {
  switch (props.task.priority) {
    case 'Urgent':
      return 'text-ink-red-5 border-ink-red-4'
    case 'High':
      return 'text-ink-amber-5'
    case 'Medium':
      return 'text-ink-gray-7'
    case 'Low':
      return 'text-ink-gray-5'
    default:
      return 'text-ink-gray-5'
  }
})

const overdue = computed(() => {
  if (!props.task.exp_end_date) return false
  const d = new Date(props.task.exp_end_date.replace(' ', 'T'))
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
})

function shortName(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
