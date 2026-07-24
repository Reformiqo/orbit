<template>
  <Dialog v-model="isOpen" :options="{ size: '2xl' }">
    <template #body>
      <div class="flex flex-col">
        <!-- Header: project chip -->
        <div class="flex items-center gap-2 px-6 pt-6">
          <div
            class="flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2 py-1 text-sm text-ink-gray-8"
          >
            <FolderClosed class="h-3.5 w-3.5 text-ink-gray-6" />
            {{ projectName || projectId }}
          </div>
          <button
            class="ml-auto flex h-7 w-7 items-center justify-center rounded text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-9"
            aria-label="Close"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Title input (borderless, large) -->
        <input
          ref="titleInput"
          v-model="form.subject"
          type="text"
          placeholder="Title"
          class="mt-2 w-full border-0 bg-transparent px-6 py-2 text-xl font-medium text-ink-gray-9 placeholder-ink-gray-4 focus:outline-none focus:ring-0"
          @keydown.meta.enter.prevent="submit"
          @keydown.ctrl.enter.prevent="submit"
        />

        <!-- Description textarea (borderless) -->
        <textarea
          v-model="form.description"
          placeholder="Click to add description"
          rows="4"
          class="w-full resize-none border-0 bg-transparent px-6 text-sm text-ink-gray-8 placeholder-ink-gray-4 focus:outline-none focus:ring-0"
        />

        <!-- Pill action row -->
        <div
          class="flex flex-wrap items-center gap-2 border-t border-outline-gray-1 px-6 py-3"
        >
          <!-- Status -->
          <Dropdown :options="stateOptions" placement="bottom-start">
            <template #default>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                data-testid="create-task-status"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{
                    backgroundColor: selectedState?.color || '#94A3B8',
                  }"
                />
                {{ selectedState?.state_name || 'Status' }}
              </button>
            </template>
          </Dropdown>

          <!-- Task type -->
          <Dropdown :options="typeOptions" placement="bottom-start">
            <template #default>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                data-testid="create-task-type"
              >
                <span
                  v-if="selectedType"
                  class="flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white"
                  :style="{
                    backgroundColor: selectedType.color || '#64748B',
                  }"
                >
                  {{ selectedType.letter_prefix }}
                </span>
                <FileType v-else class="h-3.5 w-3.5 text-ink-gray-6" />
                {{ selectedType?.type_name || 'Type' }}
              </button>
            </template>
          </Dropdown>

          <!-- Priority -->
          <Dropdown :options="priorityOptions" placement="bottom-start">
            <template #default>
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                data-testid="create-task-priority"
              >
                <Signal class="h-3.5 w-3.5 text-ink-gray-6" />
                {{ form.priority || 'Priority' }}
              </button>
            </template>
          </Dropdown>

          <!-- Assignees -->
          <div data-testid="create-task-assignees">
            <Autocomplete
              multiple
              :options="userOptions"
              :modelValue="form.assignees"
              placeholder="Assignees"
              @update:modelValue="(v) => (form.assignees = v || [])"
            />
          </div>

          <!-- Labels -->
          <Popover placement="bottom-start">
            <template #target="{ togglePopover }">
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2.5 py-1 text-sm text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
                data-testid="create-task-labels"
                @click="togglePopover"
              >
                <Tag class="h-3.5 w-3.5 text-ink-gray-6" />
                {{ labelSummary }}
              </button>
            </template>
            <template #body>
              <div
                class="w-72 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
              >
                <div
                  v-if="form.labels.length"
                  class="mb-2 flex flex-wrap gap-1 border-b border-outline-gray-1 pb-2"
                >
                  <span
                    v-for="(lbl, i) in form.labels"
                    :key="i"
                    class="inline-flex items-center gap-1 rounded bg-surface-gray-2 px-2 py-0.5 text-sm text-ink-gray-8"
                  >
                    {{ lbl }}
                    <button
                      class="text-ink-gray-5 hover:text-ink-gray-9"
                      @click="removeLabel(lbl)"
                    >
                      <XIcon class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <form @submit.prevent="addLabel">
                  <input
                    v-model="labelDraft"
                    type="text"
                    placeholder="Type a label and press Enter"
                    data-testid="create-task-labels-input"
                    class="h-9 w-full rounded border border-outline-gray-2 bg-surface-white px-2 text-base text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                  />
                </form>
              </div>
            </template>
          </Popover>

          <!-- Start date -->
          <DatePill
            v-model="form.exp_start_date"
            placeholder="Start date"
            :icon="CalendarDays"
          />

          <!-- Due date -->
          <DatePill
            v-model="form.exp_end_date"
            placeholder="Due date"
            :icon="CalendarClock"
          />

          <!-- Parent task -->
          <div data-testid="create-task-parent">
            <Autocomplete
              :options="parentOptions"
              :modelValue="form.orbit_parent_task"
              placeholder="Add parent"
              @update:modelValue="(v) => (form.orbit_parent_task = v)"
            />
          </div>
        </div>

        <!-- Error banner -->
        <div v-if="errorMessage" class="px-6 pb-2">
          <ErrorMessage :message="errorMessage" />
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-between border-t border-outline-gray-1 px-6 py-3"
        >
          <label class="flex items-center gap-2 text-sm text-ink-gray-7">
            <input
              v-model="createMore"
              type="checkbox"
              class="h-4 w-4 rounded border-outline-gray-3"
            />
            Create more
          </label>
          <div class="flex items-center gap-2">
            <Button variant="subtle" @click="close">Cancel</Button>
            <Button
              variant="solid"
              class="!bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
              :loading="submitting"
              @click="submit"
            >
              Create task
            </Button>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, h, nextTick, reactive, ref, watch } from 'vue'
import {
  Autocomplete,
  Button,
  Dialog,
  Dropdown,
  ErrorMessage,
  Popover,
  call,
  createResource,
} from 'frappe-ui'
import FolderClosed from '~icons/lucide/folder-closed'
import X from '~icons/lucide/x'
import XIcon from '~icons/lucide/x'
import Signal from '~icons/lucide/signal'
import Tag from '~icons/lucide/tag'
import CalendarDays from '~icons/lucide/calendar-days'
import CalendarClock from '~icons/lucide/calendar-clock'
import FileType from '~icons/lucide/file-type'
import DatePill from '@/components/DatePill.vue'
import { useWorkflowStatesForProject } from '@/stores/workflowStates'
import { useTaskTypesForWorkspace } from '@/stores/taskTypes'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'
import { useTasksForProject } from '@/stores/tasks'
import { useUsers } from '@/stores/users'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: String, required: true },
  projectName: { type: String, default: '' },
  initialState: { type: String, default: '' },
  initialDueDate: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'created'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const states = useWorkflowStatesForProject(props.projectId)
const tasks = useTasksForProject(props.projectId)
const { currentWorkspace } = useCurrentWorkspace()
const taskTypes = useTaskTypesForWorkspace(currentWorkspace.value?.name)
const users = useUsers()

const form = reactive({
  subject: '',
  description: '',
  orbit_workflow_state: '',
  orbit_task_type: '',
  priority: '',
  exp_start_date: '',
  exp_end_date: '',
  assignees: [],
  labels: [],
  orbit_parent_task: null,
})
const labelDraft = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const createMore = ref(false)
const titleInput = ref(null)

const selectedState = computed(() =>
  (states.data || []).find((s) => s.name === form.orbit_workflow_state),
)

const selectedType = computed(() =>
  (taskTypes.data || []).find((t) => t.name === form.orbit_task_type),
)

const stateOptions = computed(() =>
  (states.data || []).map((s) => ({
    label: s.state_name,
    icon: h('span', {
      class: 'inline-block h-2 w-2 rounded-full',
      style: { backgroundColor: s.color || '#94A3B8' },
    }),
    onClick: () => (form.orbit_workflow_state = s.name),
  })),
)

const typeOptions = computed(() =>
  (taskTypes.data || []).map((t) => ({
    label: t.type_name,
    icon: h('span', {
      class:
        'inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white',
      style: { backgroundColor: t.color || '#64748B' },
      innerHTML: t.letter_prefix,
    }),
    onClick: () => (form.orbit_task_type = t.name),
  })),
)

const priorityOptions = computed(() =>
  ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({
    label: p,
    onClick: () => (form.priority = p),
  })),
)

const userOptions = computed(() =>
  (users.data || []).map((u) => ({
    label: u.full_name || u.name,
    value: u.name,
  })),
)

const parentOptions = computed(() =>
  (tasks.data || [])
    .filter((t) => t.subject)
    .slice(0, 50)
    .map((t) => ({
      label: `${t.orbit_display_id ? `${t.orbit_display_id} · ` : ''}${t.subject}`,
      value: t.name,
    })),
)

const labelSummary = computed(() => {
  if (!form.labels.length) return 'Labels'
  if (form.labels.length === 1) return form.labels[0]
  return `${form.labels.length} labels`
})

function addLabel() {
  const trimmed = (labelDraft.value || '').trim()
  if (!trimmed) return
  if (!form.labels.includes(trimmed)) form.labels.push(trimmed)
  labelDraft.value = ''
}

function removeLabel(name) {
  form.labels = form.labels.filter((l) => l !== name)
}

function pickDefaultState() {
  const def = (states.data || []).find((s) => s.is_default)
  return def?.name || (states.data || [])[0]?.name || ''
}

function pickDefaultType() {
  const def = (taskTypes.data || []).find((t) => t.is_default)
  return def?.name || (taskTypes.data || [])[0]?.name || ''
}

watch(isOpen, async (open) => {
  if (open) {
    reset()
    await nextTick()
    titleInput.value?.focus()
  }
})

function reset() {
  form.subject = ''
  form.description = ''
  form.orbit_workflow_state = props.initialState || pickDefaultState()
  form.orbit_task_type = pickDefaultType()
  form.priority = ''
  form.exp_start_date = ''
  form.exp_end_date = props.initialDueDate || ''
  form.assignees = []
  form.labels = []
  form.orbit_parent_task = null
  labelDraft.value = ''
  errorMessage.value = ''
  submitting.value = false
}

function close() {
  isOpen.value = false
}

async function submit() {
  errorMessage.value = ''
  if (!form.subject.trim()) {
    errorMessage.value = 'Title is required.'
    return
  }
  submitting.value = true
  try {
    const doc = {
      doctype: 'Task',
      subject: form.subject.trim(),
      project: props.projectId,
    }
    if (form.description) doc.description = form.description
    if (form.orbit_workflow_state)
      doc.orbit_workflow_state = form.orbit_workflow_state
    if (form.orbit_task_type) doc.orbit_task_type = form.orbit_task_type
    if (form.priority) doc.priority = form.priority
    if (form.exp_start_date) doc.exp_start_date = form.exp_start_date
    if (form.exp_end_date) doc.exp_end_date = form.exp_end_date
    if (form.labels.length) doc.orbit_labels = form.labels.join(', ')
    if (form.orbit_parent_task) {
      const parent =
        typeof form.orbit_parent_task === 'object'
          ? form.orbit_parent_task.value
          : form.orbit_parent_task
      if (parent) doc.orbit_parent_task = parent
    }

    const created = await createResource({
      url: 'frappe.client.insert',
      params: { doc },
    }).submit()

    // Fan out assignees via the ToDo pathway (same API the detail page uses).
    const assigneeEmails = (form.assignees || [])
      .map((a) => (typeof a === 'object' ? a.value : a))
      .filter(Boolean)
    if (assigneeEmails.length && created?.name) {
      try {
        await call('frappe.desk.form.assign_to.add', {
          doctype: 'Task',
          name: created.name,
          assign_to: assigneeEmails,
        })
      } catch (err) {
        console.error('assign on create failed', err)
      }
    }

    tasks.reload()
    emit('created', created)
    if (createMore.value) {
      reset()
      await nextTick()
      titleInput.value?.focus()
    } else {
      close()
    }
  } catch (err) {
    errorMessage.value =
      err?.messages?.[0] || err?.message || 'Could not create task.'
  } finally {
    submitting.value = false
  }
}
</script>
