<template>
  <div
    class="group cursor-pointer rounded-md border border-outline-gray-2 bg-surface-white p-2.5 shadow-sm transition-colors hover:border-outline-gray-3 hover:bg-surface-gray-1"
    data-testid="kanban-card"
    :data-name="task.name"
    @click="openTask"
  >
    <!-- Top: type chip + display ID -->
    <div class="mb-1.5 flex items-center gap-1.5">
      <span
        v-if="type"
        class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white"
        :style="{ backgroundColor: type.color || '#64748B' }"
        :title="type.type_name"
      >
        {{ type.letter_prefix }}
      </span>
      <code class="text-[11px] font-medium text-ink-gray-5">
        {{ task.orbit_display_id || shortName(task.name) }}
      </code>
    </div>

    <!-- Title (2-line truncate) -->
    <p
      class="mb-2 text-sm text-ink-gray-9"
      style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
    >
      {{ task.subject }}
    </p>

    <!-- Meta row: priority, due date, assignees -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <span
          v-if="task.priority"
          class="flex-shrink-0 rounded border border-outline-gray-2 px-1.5 py-0.5 text-[10px] font-medium"
          :class="priorityClass"
        >
          {{ task.priority }}
        </span>
        <span
          v-if="task.exp_end_date"
          class="flex-shrink-0 text-[11px] text-ink-gray-6"
        >
          {{ formatDate(task.exp_end_date) }}
        </span>
      </div>
      <div class="flex flex-shrink-0 -space-x-1.5">
        <UserAvatar
          v-for="a in topAssignees"
          :key="a"
          :email="a"
          size="xs"
          class="ring-2 ring-surface-white"
        />
        <span
          v-if="extraAssignees > 0"
          class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-gray-3 text-[9px] font-medium text-ink-gray-7 ring-2 ring-surface-white"
        >
          +{{ extraAssignees }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'

const router = useRouter()

const props = defineProps({
  task: { type: Object, required: true },
  state: { type: Object, default: null },
  type: { type: Object, default: null },
})

const assignees = computed(() => {
  const raw = props.task?._assign
  if (!raw) return []
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
})

const topAssignees = computed(() => assignees.value.slice(0, 3))
const extraAssignees = computed(() => Math.max(0, assignees.value.length - 3))

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

function openTask() {
  if (!props.task?.project || !props.task?.name) return
  router.push({
    name: 'TaskDetail',
    params: { projectId: props.task.project, taskId: props.task.name },
  })
}

function shortName(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
