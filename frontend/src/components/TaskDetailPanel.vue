<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-black/20"
        @click="close"
      />
    </transition>

    <!-- Panel -->
    <transition
      enter-active-class="transition-transform duration-200"
      leave-active-class="transition-transform duration-200"
      enter-from-class="translate-x-full"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="modelValue"
        class="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[560px] flex-col border-l border-outline-gray-2 bg-surface-white shadow-xl"
        data-testid="task-detail-panel"
      >
        <!-- Header -->
        <header
          class="flex items-center justify-between border-b border-outline-gray-1 px-5 py-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              v-if="type"
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
              :style="{ backgroundColor: type.color || '#64748B' }"
            >
              {{ type.letter_prefix }}
            </span>
            <code class="text-sm text-ink-gray-5">
              {{ task?.orbit_display_id || shortName(task?.name) }}
            </code>
            <Badge
              v-if="dirty"
              variant="subtle"
              theme="blue"
              size="sm"
              label="Saving…"
            />
            <Badge
              v-else-if="justSaved"
              variant="subtle"
              theme="green"
              size="sm"
              label="Saved"
            />
          </div>
          <button
            class="flex h-7 w-7 items-center justify-center rounded text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
            aria-label="Close"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <!-- Body -->
        <div v-if="task" class="flex-1 overflow-y-auto">
          <!-- Title -->
          <div class="px-5 pt-5">
            <input
              v-model="localTitle"
              type="text"
              class="w-full border-0 bg-transparent p-0 text-xl font-medium text-ink-gray-9 placeholder-ink-gray-4 focus:outline-none focus:ring-0"
              placeholder="Task title"
              @blur="saveField('subject', localTitle)"
              @keydown.enter.prevent="$event.target.blur()"
            />
          </div>

          <!-- Properties -->
          <dl class="grid grid-cols-[140px_1fr] gap-y-2 px-5 py-4 text-sm">
            <!-- Status -->
            <dt class="flex items-center text-ink-gray-6">
              <CircleDashed class="mr-1.5 h-3.5 w-3.5" /> Status
            </dt>
            <dd>
              <Dropdown :options="stateOptions" placement="bottom-start">
                <template #default>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                  >
                    <span
                      v-if="currentState"
                      class="h-2 w-2 rounded-full"
                      :style="{
                        backgroundColor: currentState.color || '#94A3B8',
                      }"
                    />
                    {{ currentState?.state_name || 'Set status' }}
                  </button>
                </template>
              </Dropdown>
            </dd>

            <!-- Priority -->
            <dt class="flex items-center text-ink-gray-6">
              <Signal class="mr-1.5 h-3.5 w-3.5" /> Priority
            </dt>
            <dd>
              <Dropdown :options="priorityOptions" placement="bottom-start">
                <template #default>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                  >
                    {{ task.priority || 'Set priority' }}
                  </button>
                </template>
              </Dropdown>
            </dd>

            <!-- Type -->
            <dt class="flex items-center text-ink-gray-6">
              <FileType class="mr-1.5 h-3.5 w-3.5" /> Type
            </dt>
            <dd>
              <Dropdown :options="typeOptions" placement="bottom-start">
                <template #default>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                  >
                    <span
                      v-if="type"
                      class="flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white"
                      :style="{ backgroundColor: type.color }"
                    >
                      {{ type.letter_prefix }}
                    </span>
                    {{ type?.type_name || 'Set type' }}
                  </button>
                </template>
              </Dropdown>
            </dd>

            <!-- Assignees -->
            <dt class="flex items-center text-ink-gray-6">
              <Users class="mr-1.5 h-3.5 w-3.5" /> Assignees
            </dt>
            <dd>
              <div class="flex flex-wrap items-center gap-1">
                <span
                  v-for="a in assignees"
                  :key="a"
                  class="inline-flex items-center gap-1 rounded border border-outline-gray-2 pl-1 pr-1.5 py-0.5"
                >
                  <UserAvatar :email="a" size="xs" />
                  <span class="text-xs text-ink-gray-8">{{ userName(a) }}</span>
                  <button
                    class="ml-0.5 text-ink-gray-5 hover:text-ink-gray-9"
                    @click="removeAssignee(a)"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </span>
                <Popover placement="bottom-start">
                  <template #target="{ togglePopover }">
                    <button
                      class="inline-flex items-center gap-1 rounded-md border border-dashed border-outline-gray-2 px-2 py-0.5 text-xs text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
                      @click="togglePopover"
                    >
                      <Plus class="h-3 w-3" /> Assign
                    </button>
                  </template>
                  <template #body>
                    <div
                      class="w-64 rounded-md border border-outline-gray-2 bg-surface-white p-2 shadow-lg"
                    >
                      <div class="relative mb-1.5 flex items-center">
                        <Search
                          class="absolute left-2 h-3 w-3 text-ink-gray-5"
                        />
                        <input
                          v-model="userSearch"
                          type="text"
                          placeholder="Search users…"
                          class="h-7 w-full rounded border border-outline-gray-2 bg-surface-white pl-7 pr-2 text-xs text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                        />
                      </div>
                      <div class="max-h-60 overflow-y-auto">
                        <button
                          v-for="u in filteredUsers"
                          :key="u.name"
                          class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left hover:bg-surface-gray-2"
                          :disabled="assignees.includes(u.name)"
                          :class="{
                            'cursor-not-allowed opacity-50': assignees.includes(
                              u.name,
                            ),
                          }"
                          @click="addAssignee(u.name)"
                        >
                          <UserAvatar
                            :email="u.name"
                            :name="u.full_name"
                            size="xs"
                          />
                          <span class="truncate text-sm text-ink-gray-8">{{
                            u.full_name || u.name
                          }}</span>
                        </button>
                      </div>
                    </div>
                  </template>
                </Popover>
              </div>
            </dd>

            <!-- Due date -->
            <dt class="flex items-center text-ink-gray-6">
              <CalendarClock class="mr-1.5 h-3.5 w-3.5" /> Due date
            </dt>
            <dd>
              <DatePill
                :modelValue="localDueDate"
                placeholder="Set due date"
                :icon="CalendarClock"
                @update:modelValue="onDueDateChange"
              />
            </dd>

            <!-- Reporter -->
            <dt class="flex items-center text-ink-gray-6">
              <UserPen class="mr-1.5 h-3.5 w-3.5" /> Reporter
            </dt>
            <dd class="flex items-center gap-1.5">
              <UserAvatar
                v-if="task.orbit_reporter"
                :email="task.orbit_reporter"
                size="xs"
              />
              <span class="text-sm text-ink-gray-8">
                {{ userName(task.orbit_reporter) || '—' }}
              </span>
            </dd>
          </dl>

          <!-- Description -->
          <div class="px-5 pb-6">
            <label
              class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-gray-6"
            >
              Description
            </label>
            <textarea
              v-model="localDescription"
              rows="8"
              placeholder="Click to add description"
              class="w-full resize-y rounded-md border border-outline-gray-2 bg-surface-white p-3 text-sm text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
              @blur="saveField('description', localDescription)"
            />
          </div>
        </div>

        <!-- Loading -->
        <div
          v-else
          class="flex flex-1 items-center justify-center text-sm text-ink-gray-5"
        >
          Loading task…
        </div>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, h, ref, watch } from 'vue'
import {
  Badge,
  Dropdown,
  Popover,
  createResource,
  frappeRequest,
} from 'frappe-ui'
import X from '~icons/lucide/x'
import Plus from '~icons/lucide/plus'
import Search from '~icons/lucide/search'
import CircleDashed from '~icons/lucide/circle-dashed'
import Signal from '~icons/lucide/signal'
import FileType from '~icons/lucide/file-type'
import Users from '~icons/lucide/users'
import CalendarClock from '~icons/lucide/calendar-clock'
import UserPen from '~icons/lucide/user-pen'
import UserAvatar from '@/components/UserAvatar.vue'
import DatePill from '@/components/DatePill.vue'
import { useTasksForProject } from '@/stores/tasks'
import { useUsers } from '@/stores/users'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  state: { type: Object, default: null },
  type: { type: Object, default: null },
  states: { type: Array, default: () => [] },
  types: { type: Array, default: () => [] },
  projectId: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const { reload } = useTasksForProject(props.projectId)
const users = useUsers()

const localTitle = ref('')
const localDescription = ref('')
const localDueDate = ref('')
const dirty = ref(false)
const justSaved = ref(false)
let savedTimer = null

const currentState = computed(
  () =>
    props.state ||
    props.states.find((s) => s.name === props.task?.orbit_workflow_state),
)

const stateOptions = computed(() =>
  (props.states || []).map((s) => ({
    label: s.state_name,
    icon: h('span', {
      class: 'inline-block h-2 w-2 rounded-full',
      style: { backgroundColor: s.color || '#94A3B8' },
    }),
    onClick: () => saveField('orbit_workflow_state', s.name),
  })),
)

const priorityOptions = computed(() =>
  ['Urgent', 'High', 'Medium', 'Low'].map((p) => ({
    label: p,
    onClick: () => saveField('priority', p),
  })),
)

const typeOptions = computed(() =>
  (props.types || []).map((t) => ({
    label: t.type_name,
    icon: h('span', {
      class:
        'inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white',
      style: { backgroundColor: t.color || '#64748B' },
      innerHTML: t.letter_prefix,
    }),
    onClick: () => saveField('orbit_task_type', t.name),
  })),
)

// Assignees
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

const userSearch = ref('')
const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  const pool = users.data || []
  const matched = q
    ? pool.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.full_name || '').toLowerCase().includes(q),
      )
    : pool
  return matched.slice(0, 20)
})

function userName(email) {
  if (!email) return ''
  const u = (users.data || []).find((x) => x.name === email)
  return u?.full_name || email
}

async function addAssignee(email) {
  if (!props.task || assignees.value.includes(email)) return
  try {
    await frappeRequest({
      url: '/api/method/frappe.desk.form.assign_to.add',
      method: 'POST',
      params: {
        assign_to: JSON.stringify([email]),
        doctype: 'Task',
        name: props.task.name,
      },
    })
    flashSaved()
    reload()
  } catch (err) {
    console.error(err)
  }
}

async function removeAssignee(email) {
  if (!props.task) return
  try {
    await frappeRequest({
      url: '/api/method/frappe.desk.form.assign_to.remove',
      method: 'POST',
      params: {
        doctype: 'Task',
        name: props.task.name,
        assign_to: email,
      },
    })
    flashSaved()
    reload()
  } catch (err) {
    console.error(err)
  }
}

// Sync local editable state when task changes
watch(
  () => props.task,
  (t) => {
    localTitle.value = t?.subject || ''
    localDescription.value = t?.description || ''
    localDueDate.value = t?.exp_end_date || ''
  },
  { immediate: true },
)

async function saveField(field, value) {
  if (!props.task) return
  // Skip no-op saves
  if (props.task[field] === value) return
  dirty.value = true
  try {
    await createResource({
      url: 'frappe.client.set_value',
      params: {
        doctype: 'Task',
        name: props.task.name,
        fieldname: field,
        value,
      },
    }).submit()
    flashSaved()
    reload()
  } catch (err) {
    console.error(`Save failed for ${field}:`, err)
  } finally {
    dirty.value = false
  }
}

function onDueDateChange(v) {
  localDueDate.value = v
  saveField('exp_end_date', v || null)
}

function flashSaved() {
  justSaved.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (justSaved.value = false), 1500)
}

function shortName(n) {
  return n ? `…${n.slice(-6)}` : ''
}

function close() {
  emit('update:modelValue', false)
}
</script>
