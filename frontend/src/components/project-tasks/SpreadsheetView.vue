<template>
  <div class="flex h-full flex-col" data-testid="tasks-view-spreadsheet">
    <!-- Bulk action bar -->
    <div
      v-if="selectedIds.size > 0"
      class="flex items-center justify-between border-b border-outline-gray-1 bg-surface-gray-1 px-5 py-2"
      data-testid="spreadsheet-bulk-bar"
    >
      <span class="text-sm text-ink-gray-8">
        {{ selectedIds.size }} selected
      </span>
      <div class="flex items-center gap-2">
        <Button variant="subtle" @click="selectedIds = new Set()">
          Clear
        </Button>
        <Button
          variant="solid"
          theme="red"
          :loading="deleting"
          data-testid="spreadsheet-bulk-delete"
          @click="confirmAndDelete"
        >
          <template #prefix><Trash2 class="h-4 w-4" /></template>
          Delete {{ selectedIds.size }} selected
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full border-collapse text-sm">
        <thead
          class="sticky top-0 z-10 bg-surface-menu-bar text-left text-xs font-medium uppercase tracking-wide text-ink-gray-6 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]"
        >
          <tr class="h-8">
            <th class="w-8 border-b border-outline-gray-2 px-3">
              <input
                type="checkbox"
                class="h-3.5 w-3.5"
                :checked="allVisibleSelected"
                :indeterminate.prop="someVisibleSelected"
                data-testid="spreadsheet-select-all"
                @change="toggleSelectAll"
              />
            </th>
            <th class="w-8 border-b border-outline-gray-2 px-2"></th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="cursor-pointer select-none border-b border-outline-gray-2 px-3 py-1.5 hover:bg-surface-gray-2"
              :class="col.widthClass"
              :data-testid="`sheet-col-${col.key}`"
              @click="toggleSort(col.key)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <ArrowUp
                  v-if="sort.key === col.key && sort.dir === 'asc'"
                  class="h-3 w-3"
                />
                <ArrowDown
                  v-if="sort.key === col.key && sort.dir === 'desc'"
                  class="h-3 w-3"
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in sortedTasks"
            :key="t.name"
            class="group border-b border-outline-gray-1 hover:bg-surface-gray-1"
            :class="{ 'bg-blue-50': selectedIds.has(t.name) }"
            data-testid="sheet-row"
            @click="openTask(t)"
          >
            <td class="px-3 py-1" @click.stop>
              <input
                type="checkbox"
                class="h-3.5 w-3.5"
                :checked="selectedIds.has(t.name)"
                @change="toggleSelect(t.name)"
              />
            </td>
            <td class="px-2 py-1">
              <span
                v-if="getType(t)"
                class="flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white"
                :style="{ backgroundColor: getType(t).color || '#64748B' }"
                :title="getType(t).type_name"
              >
                {{ getType(t).letter_prefix }}
              </span>
            </td>
            <td class="px-3 py-1">
              <code class="text-xs text-ink-gray-6">
                {{ t.orbit_display_id || shortName(t.name) }}
              </code>
            </td>
            <td class="px-3 py-1 text-ink-gray-9">
              <span class="block truncate" :title="t.subject">
                {{ t.subject }}
              </span>
            </td>
            <td class="px-3 py-1" @click.stop>
              <Dropdown :options="stateOptionsFor(t)" placement="bottom-start">
                <template #default>
                  <button
                    class="inline-flex items-center gap-1.5 rounded border border-outline-gray-2 px-1.5 py-0.5 text-xs text-ink-gray-7 hover:bg-surface-gray-2"
                  >
                    <span
                      v-if="getState(t)"
                      class="h-2 w-2 rounded-full"
                      :style="{
                        backgroundColor: getState(t).color || '#94A3B8',
                      }"
                    />
                    {{ getState(t)?.state_name || '—' }}
                  </button>
                </template>
              </Dropdown>
            </td>
            <td class="px-3 py-1" @click.stop>
              <Dropdown
                :options="priorityOptionsFor(t)"
                placement="bottom-start"
              >
                <template #default>
                  <button
                    class="inline-flex items-center gap-1.5 rounded border border-outline-gray-2 px-1.5 py-0.5 text-xs hover:bg-surface-gray-2"
                    :class="priorityClass(t.priority)"
                  >
                    {{ t.priority || '—' }}
                  </button>
                </template>
              </Dropdown>
            </td>
            <td class="px-3 py-1" @click.stop>
              <div class="flex flex-shrink-0 -space-x-1.5">
                <UserAvatar
                  v-for="a in taskAssignees(t).slice(0, 3)"
                  :key="a"
                  :email="a"
                  size="xs"
                  class="ring-2 ring-surface-white"
                />
                <span
                  v-if="taskAssignees(t).length > 3"
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-gray-3 text-[9px] font-medium text-ink-gray-7 ring-2 ring-surface-white"
                >
                  +{{ taskAssignees(t).length - 3 }}
                </span>
                <span
                  v-if="!taskAssignees(t).length"
                  class="text-xs text-ink-gray-5"
                >
                  —
                </span>
              </div>
            </td>
            <td class="px-3 py-1 text-xs text-ink-gray-6">
              {{ t.exp_end_date ? formatDate(t.exp_end_date) : '—' }}
            </td>
            <td class="px-3 py-1 text-xs text-ink-gray-5">
              {{ t.modified ? relativeDate(t.modified) : '' }}
            </td>
          </tr>
          <tr v-if="!sortedTasks.length">
            <td
              colspan="9"
              class="px-5 py-8 text-center text-sm text-ink-gray-5"
            >
              No tasks.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Dropdown, createResource } from 'frappe-ui'
import Trash2 from '~icons/lucide/trash-2'
import ArrowUp from '~icons/lucide/arrow-up'
import ArrowDown from '~icons/lucide/arrow-down'
import UserAvatar from '@/components/UserAvatar.vue'

const router = useRouter()

const props = defineProps({
  filteredTasks: { type: Array, required: true },
  states: { type: Array, default: () => [] },
  taskTypes: { type: Array, default: () => [] },
  getState: { type: Function, required: true },
  getType: { type: Function, required: true },
  onReload: { type: Function, default: () => {} },
})

const columns = [
  { key: 'orbit_display_id', label: 'ID', widthClass: 'w-24' },
  { key: 'subject', label: 'Title', widthClass: '' },
  { key: 'status', label: 'Status', widthClass: 'w-32' },
  { key: 'priority', label: 'Priority', widthClass: 'w-24' },
  { key: 'assignees', label: 'Assignees', widthClass: 'w-28' },
  { key: 'exp_end_date', label: 'Due', widthClass: 'w-24' },
  { key: 'modified', label: 'Modified', widthClass: 'w-24' },
]

const sort = ref({ key: 'modified', dir: 'desc' })
const selectedIds = ref(new Set())
const deleting = ref(false)

const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 }

const sortedTasks = computed(() => {
  const list = [...props.filteredTasks]
  const { key, dir } = sort.value
  const mul = dir === 'asc' ? 1 : -1
  list.sort((a, b) => {
    let av
    let bv
    switch (key) {
      case 'subject':
      case 'orbit_display_id':
        av = (a[key] || '').toLowerCase()
        bv = (b[key] || '').toLowerCase()
        return av.localeCompare(bv) * mul
      case 'status':
        av = props.getState(a)?.state_name || ''
        bv = props.getState(b)?.state_name || ''
        return av.localeCompare(bv) * mul
      case 'priority':
        av = priorityRank[a.priority] ?? 99
        bv = priorityRank[b.priority] ?? 99
        return (av - bv) * mul
      case 'assignees':
        av = taskAssignees(a).length
        bv = taskAssignees(b).length
        return (av - bv) * mul
      case 'exp_end_date':
        av = a.exp_end_date ? +new Date(a.exp_end_date) : Infinity
        bv = b.exp_end_date ? +new Date(b.exp_end_date) : Infinity
        return (av - bv) * mul
      case 'modified':
      default:
        av = a.modified ? +new Date(a.modified) : 0
        bv = b.modified ? +new Date(b.modified) : 0
        return (av - bv) * mul
    }
  })
  return list
})

function toggleSort(key) {
  if (sort.value.key === key) {
    sort.value = { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    sort.value = { key, dir: 'asc' }
  }
}

const allVisibleSelected = computed(
  () =>
    sortedTasks.value.length > 0 &&
    sortedTasks.value.every((t) => selectedIds.value.has(t.name)),
)

const someVisibleSelected = computed(
  () =>
    !allVisibleSelected.value &&
    sortedTasks.value.some((t) => selectedIds.value.has(t.name)),
)

function toggleSelect(name) {
  const next = new Set(selectedIds.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(sortedTasks.value.map((t) => t.name))
  }
}

function stateOptionsFor(task) {
  return (props.states || []).map((s) => ({
    label: s.state_name,
    icon: h('span', {
      class: 'inline-block h-2 w-2 rounded-full',
      style: { backgroundColor: s.color || '#94A3B8' },
    }),
    onClick: () => updateField(task, 'orbit_workflow_state', s.name),
  }))
}

function priorityOptionsFor(task) {
  return ['Urgent', 'High', 'Medium', 'Low'].map((p) => ({
    label: p,
    onClick: () => updateField(task, 'priority', p),
  }))
}

async function updateField(task, fieldname, value) {
  if (task[fieldname] === value) return
  try {
    await createResource({
      url: 'frappe.client.set_value',
      params: {
        doctype: 'Task',
        name: task.name,
        fieldname,
        value,
      },
    }).submit()
    await props.onReload?.()
  } catch (err) {
    console.error('Update failed', err)
  }
}

async function confirmAndDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return

  const ok = confirm(
    `Delete ${ids.length} task${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
  )
  if (!ok) return
  deleting.value = true
  try {
    for (const name of ids) {
      await createResource({
        url: 'frappe.client.delete',
        params: { doctype: 'Task', name },
      }).submit()
    }
    selectedIds.value = new Set()
    await props.onReload?.()
  } catch (err) {
    console.error('Delete failed', err)
  } finally {
    deleting.value = false
  }
}

function taskAssignees(t) {
  if (!t._assign) return []
  try {
    const p = typeof t._assign === 'string' ? JSON.parse(t._assign) : t._assign
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function priorityClass(p) {
  switch (p) {
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
}

function shortName(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(String(iso).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function relativeDate(iso) {
  if (!iso) return ''
  const d = new Date(String(iso).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function openTask(t) {
  if (!t?.project || !t?.name) return
  router.push({
    name: 'TaskDetail',
    params: { projectId: t.project, taskId: t.name },
  })
}
</script>
