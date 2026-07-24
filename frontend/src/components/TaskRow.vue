<template>
  <li
    class="flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-gray-2"
    data-testid="task-row"
    @click="openTask"
  >
    <!-- Task type chip: colored square with letter prefix -->
    <span
      v-if="type"
      class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
      :style="{ backgroundColor: type.color || '#64748B' }"
      :title="type.type_name"
    >
      {{ type.letter_prefix }}
    </span>
    <code
      class="w-20 flex-shrink-0 truncate text-xs font-medium text-ink-gray-5"
    >
      {{ task.orbit_display_id || shortName(task.name) }}
    </code>
    <span class="flex-1 truncate text-sm text-ink-gray-9">
      {{ task.subject }}
    </span>
    <span
      v-if="task.priority"
      class="flex-shrink-0 rounded border border-outline-gray-2 px-1.5 py-0.5 text-[10px] font-medium"
      :class="priorityClass"
    >
      {{ task.priority }}
    </span>
    <span
      v-if="state"
      class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-outline-gray-2 px-2 py-0.5 text-xs text-ink-gray-7"
    >
      <span
        class="h-2 w-2 rounded-full"
        :style="{ backgroundColor: state.color || '#94A3B8' }"
      />
      {{ state.state_name }}
    </span>
    <span
      v-if="task.exp_end_date"
      class="flex-shrink-0 text-xs text-ink-gray-6"
    >
      {{ formatDate(task.exp_end_date) }}
    </span>
  </li>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  task: { type: Object, required: true },
  state: { type: Object, default: null },
  type: { type: Object, default: null },
})

function openTask() {
  if (!props.task?.project || !props.task?.name) return
  router.push({
    name: 'TaskDetail',
    params: { projectId: props.task.project, taskId: props.task.name },
  })
}

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

function shortName(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
