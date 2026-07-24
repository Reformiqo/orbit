<template>
  <div class="flex h-full overflow-x-auto px-4 py-3" data-testid="tasks-view-kanban">
    <div
      v-for="col in columns"
      :key="col.state.name"
      class="mr-3 flex w-72 min-w-72 flex-col rounded-md bg-surface-gray-1"
      :data-testid="`kanban-column-${columnTestId(col.state)}`"
      :data-state="col.state.name"
    >
      <!-- Column header -->
      <header class="flex items-center gap-2 px-3 py-2">
        <span
          class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          :style="{ backgroundColor: col.state.color || '#94A3B8' }"
        />
        <span class="text-sm font-medium text-ink-gray-9">
          {{ col.state.state_name }}
        </span>
        <span class="text-xs text-ink-gray-5">{{ col.items.length }}</span>
        <button
          class="ml-auto flex h-5 w-5 items-center justify-center rounded text-ink-gray-5 transition-colors hover:bg-surface-gray-3 hover:text-ink-gray-9"
          :title="`Add task to ${col.state.state_name}`"
          :data-testid="`kanban-add-${columnTestId(col.state)}`"
          @click="$emit('openCreate', col.state.name)"
        >
          <Plus class="h-3.5 w-3.5" />
        </button>
      </header>

      <!-- Cards list -->
      <draggable
        :list="col.items"
        :group="{ name: 'tasks' }"
        item-key="name"
        class="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3"
        :data-state="col.state.name"
        ghost-class="opacity-50"
        @end="onDragEnd($event, col.state.name)"
      >
        <template #item="{ element: task }">
          <KanbanCard
            :task="task"
            :state="col.state"
            :type="getType(task)"
          />
        </template>
      </draggable>

      <div
        v-if="!col.items.length"
        class="px-3 pb-3 text-xs italic text-ink-gray-5"
      >
        No tasks
      </div>
    </div>

    <!-- Orphan column for tasks with no state -->
    <div
      v-if="orphanTasks.length"
      class="mr-3 flex w-72 min-w-72 flex-col rounded-md bg-surface-gray-1"
    >
      <header class="flex items-center gap-2 px-3 py-2">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-surface-gray-3" />
        <span class="text-sm font-medium text-ink-gray-9">No status</span>
        <span class="text-xs text-ink-gray-5">{{ orphanTasks.length }}</span>
      </header>
      <div class="flex flex-col gap-2 overflow-y-auto px-2 pb-3">
        <KanbanCard
          v-for="t in orphanTasks"
          :key="t.name"
          :task="t"
          :state="null"
          :type="getType(t)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { createResource } from 'frappe-ui'
import draggable from 'vuedraggable'
import Plus from '~icons/lucide/plus'
import KanbanCard from './KanbanCard.vue'

const props = defineProps({
  filteredTasks: { type: Array, required: true },
  states: { type: Array, default: () => [] },
  taskTypes: { type: Array, default: () => [] },
  getState: { type: Function, required: true },
  getType: { type: Function, required: true },
  onReload: { type: Function, default: () => {} },
})

const emit = defineEmits(['openCreate'])

// Local mutable mirror per column so vuedraggable can mutate arrays
// while we still react to upstream changes.
const localColumns = ref([])

function rebuild() {
  const sortedStates = [...props.states].sort(
    (a, b) => (a.position || 0) - (b.position || 0),
  )
  localColumns.value = sortedStates.map((s) => ({
    state: s,
    items: props.filteredTasks.filter(
      (t) => t.orbit_workflow_state === s.name,
    ),
  }))
}

watch(
  () => [props.filteredTasks, props.states],
  () => rebuild(),
  { immediate: true, deep: true },
)

const columns = computed(() => localColumns.value)

const orphanTasks = computed(() => {
  const known = new Set(props.states.map((s) => s.name))
  return props.filteredTasks.filter(
    (t) => !known.has(t.orbit_workflow_state),
  )
})

function columnTestId(state) {
  return (state.state_name || state.name).toLowerCase().replace(/\s+/g, '-')
}

async function onDragEnd(evt, toStateName) {
  const item = evt?.item
  if (!item) return
  const taskName = item.dataset.name
  if (!taskName) return

  // Find what state the task currently has in the store — if it already
  // matches toStateName, this was a reorder within the same column.
  const task = props.filteredTasks.find((t) => t.name === taskName)
  if (!task) return
  if (task.orbit_workflow_state === toStateName) return

  try {
    await createResource({
      url: 'frappe.client.set_value',
      params: {
        doctype: 'Task',
        name: taskName,
        fieldname: 'orbit_workflow_state',
        value: toStateName,
      },
    }).submit()
    await props.onReload?.()
  } catch (err) {
    console.error('Failed to move task', err)
    // Revert local optimistic state by rebuilding from store
    rebuild()
  }
}
</script>
