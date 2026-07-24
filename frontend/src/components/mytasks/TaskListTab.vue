<template>
  <div class="flex flex-col">
    <div
      v-if="!tasks.length"
      class="flex h-64 items-center justify-center"
    >
      <div class="text-center">
        <CheckSquare class="mx-auto h-10 w-10 text-ink-gray-5" />
        <h2 class="mt-3 text-xl font-medium text-ink-gray-9">
          {{ emptyTitle }}
        </h2>
        <p class="mt-1.5 text-base text-ink-gray-5">{{ emptySubtitle }}</p>
      </div>
    </div>
    <ul v-else class="divide-y divide-outline-gray-1" data-testid="mytasks-list">
      <MyTaskRow
        v-for="t in sortedTasks"
        :key="t.name"
        :task="t"
        :state="stateMap.get(t.orbit_workflow_state)"
        :type="typeMap.get(t.orbit_task_type)"
        :project="projectMap.get(t.project)"
        :showProject="true"
      />
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CheckSquare from '~icons/lucide/check-square'
import MyTaskRow from '@/components/MyTaskRow.vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  states: { type: Array, default: () => [] },
  types: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  emptyTitle: { type: String, default: 'No tasks' },
  emptySubtitle: { type: String, default: '' },
})

const stateMap = computed(() => {
  const m = new Map()
  for (const s of props.states) m.set(s.name, s)
  return m
})
const typeMap = computed(() => {
  const m = new Map()
  for (const t of props.types) m.set(t.name, t)
  return m
})
const projectMap = computed(() => {
  const m = new Map()
  for (const p of props.projects) m.set(p.name, p)
  return m
})

const sortedTasks = computed(() => {
  const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
  return [...props.tasks].sort(
    (a, b) => (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99),
  )
})
</script>
