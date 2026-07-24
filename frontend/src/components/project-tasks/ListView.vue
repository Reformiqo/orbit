<template>
  <div class="h-full overflow-auto" data-testid="tasks-view-list">
    <div
      v-if="!filteredTasks.length"
      class="flex h-full items-center justify-center"
    >
      <div class="text-center">
        <Filter class="mx-auto h-8 w-8 text-ink-gray-5" />
        <h2 class="mt-3 text-lg font-medium text-ink-gray-9">No matches</h2>
        <p class="mt-1 text-sm text-ink-gray-5">
          Try adjusting your filters or search.
        </p>
      </div>
    </div>

    <div v-else data-testid="tasks-list">
      <template v-if="groupBy !== 'none'">
        <section
          v-for="group in grouped"
          :key="group.key"
          class="border-b border-outline-gray-1 last:border-b-0"
          :data-testid="`tasks-group-${group.testId}`"
        >
          <header
            class="flex cursor-pointer items-center gap-2 bg-surface-menu-bar px-5 py-2 transition-colors hover:bg-surface-gray-2"
            @click="toggleCollapse(group.key)"
          >
            <ChevronDown
              class="h-3.5 w-3.5 text-ink-gray-6 transition-transform"
              :class="{ '-rotate-90': collapsed[group.key] }"
            />
            <span
              v-if="group.color"
              class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              :style="{ backgroundColor: group.color }"
            />
            <span class="text-sm font-medium text-ink-gray-9">
              {{ group.label }}
            </span>
            <span class="text-xs text-ink-gray-5">{{
              group.items.length
            }}</span>
          </header>
          <ul
            v-show="!collapsed[group.key]"
            class="divide-y divide-outline-gray-1"
          >
            <TaskRow
              v-for="t in group.items"
              :key="t.name"
              :task="t"
              :state="getState(t)"
              :type="getType(t)"
              @open="openTask(t)"
            />
          </ul>
        </section>
      </template>

      <ul v-else class="divide-y divide-outline-gray-1">
        <TaskRow
          v-for="t in filteredTasks"
          :key="t.name"
          :task="t"
          :state="getState(t)"
          :type="getType(t)"
          @open="openTask(t)"
        />
      </ul>

      <button
        class="flex w-full items-center gap-2 px-5 py-2.5 text-sm text-ink-gray-5 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
        @click="$emit('openCreate')"
      >
        <Plus class="h-4 w-4" />
        New task
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import Plus from '~icons/lucide/plus'
import Filter from '~icons/lucide/filter'
import ChevronDown from '~icons/lucide/chevron-down'
import TaskRow from '@/components/TaskRow.vue'

const props = defineProps({
  filteredTasks: { type: Array, required: true },
  states: { type: Array, default: () => [] },
  taskTypes: { type: Array, default: () => [] },
  groupBy: { type: String, default: 'none' },
  getState: { type: Function, required: true },
  getType: { type: Function, required: true },
})

const emit = defineEmits(['openCreate', 'openTask'])

const collapsed = reactive({})

function toggleCollapse(key) {
  collapsed[key] = !collapsed[key]
}

function openTask(t) {
  emit('openTask', t)
}

const stateMap = computed(() => {
  const m = new Map()
  for (const s of props.states) m.set(s.name, s)
  return m
})

const grouped = computed(() => {
  if (props.groupBy === 'status') {
    const out = []
    for (const s of props.states) {
      const items = props.filteredTasks.filter(
        (t) => t.orbit_workflow_state === s.name,
      )
      if (!items.length) continue
      out.push({
        key: s.name,
        label: s.state_name,
        color: s.color,
        items,
        testId: s.state_name.toLowerCase().replace(/\s+/g, '-'),
      })
    }
    const orphans = props.filteredTasks.filter(
      (t) => !stateMap.value.has(t.orbit_workflow_state),
    )
    if (orphans.length) {
      out.push({
        key: '__no-status__',
        label: 'No status',
        color: '#CBD5E1',
        items: orphans,
        testId: 'no-status',
      })
    }
    return out
  }
  if (props.groupBy === 'priority') {
    const order = ['Urgent', 'High', 'Medium', 'Low', '']
    return order
      .map((p) => ({
        key: p || '__none__',
        label: p || 'No priority',
        color: null,
        items: props.filteredTasks.filter((t) => (t.priority || '') === p),
        testId: (p || 'no-priority').toLowerCase(),
      }))
      .filter((g) => g.items.length)
  }
  return []
})
</script>
