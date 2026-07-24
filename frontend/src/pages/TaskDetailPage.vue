<template>
  <div class="flex h-full w-full bg-surface-white">
    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <!-- Breadcrumb header -->
      <header
        class="flex items-center justify-between border-b border-outline-gray-1 px-8 py-4"
      >
        <nav class="flex items-center gap-2 text-base text-ink-gray-6 min-w-0">
          <button
            class="flex h-9 w-9 items-center justify-center rounded text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
            title="Back"
            @click="goBack"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <RouterLink
            v-if="project"
            :to="{ name: 'ProjectDetail', params: { projectId, tab: 'tasks' } }"
            class="flex items-center gap-1.5 text-ink-gray-8 hover:text-ink-gray-9 truncate"
          >
            <FolderClosed class="h-4 w-4 flex-shrink-0" />
            <span class="truncate">{{ project.project_name }}</span>
          </RouterLink>
          <ChevronRight class="h-4 w-4 flex-shrink-0 text-ink-gray-5" />
          <span class="text-base font-medium text-ink-gray-9 truncate">
            {{ task?.orbit_display_id || taskId }} Details
          </span>
        </nav>
      </header>

      <div v-if="task" class="w-full px-12 py-10">
        <!-- Type + display ID -->
        <div class="mb-4 flex items-center gap-2 text-sm text-ink-gray-6">
          <span
            v-if="type"
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
            :style="{ backgroundColor: type.color || '#64748B' }"
            :title="type.type_name"
          >
            {{ type.letter_prefix }}
          </span>
          <code class="text-base text-ink-gray-5">
            {{ task.orbit_display_id || taskId }}
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

        <!-- Title -->
        <textarea
          v-model="localTitle"
          rows="1"
          class="mb-8 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-4xl font-semibold leading-tight text-ink-gray-9 placeholder-ink-gray-4 focus:outline-none focus:ring-0"
          placeholder="Task title"
          @input="autoGrow"
          @blur="saveField('subject', localTitle)"
        />

        <!-- Description block -->
        <div
          class="min-h-[14rem] rounded-md border border-outline-gray-1 bg-surface-white"
          data-testid="task-description-editor"
        >
          <RichEditor
            v-model="localDescription"
            profile="issue-description"
            placeholder="Click to add description. Type / for commands, @ to mention a user."
            :project-id="projectId"
            :show-toolbar="true"
            @blur="saveField('description', localDescription)"
          />
        </div>

        <!-- Sub-task placeholder -->
        <div class="mt-8 flex items-center gap-2">
          <button
            class="inline-flex items-center gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-4 py-2 text-base text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
            disabled
            title="Subtasks — coming soon"
          >
            <Plus class="h-4 w-4" />
            Add sub-task
          </button>
        </div>

        <!-- Tabs -->
        <nav
          class="mt-10 flex gap-2 border-b border-outline-gray-1"
          data-testid="task-tabs"
        >
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="relative px-4 pb-3 pt-3 text-base transition-colors"
            :class="
              activeTab === tab.key
                ? 'font-medium text-ink-gray-9'
                : 'text-ink-gray-5 hover:text-ink-gray-8'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span
              v-if="activeTab === tab.key"
              class="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-ink-gray-9"
            />
          </button>
        </nav>

        <!-- Tab content -->
        <div class="py-8">
          <div v-if="activeTab === 'comments'">
            <div
              class="mb-6 rounded-md border border-outline-gray-2 bg-surface-white"
              data-testid="task-comment-composer"
            >
              <div class="min-h-[7rem]">
                <RichEditor
                  v-model="commentDraft"
                  profile="comment"
                  placeholder="Leave a comment…"
                  :project-id="projectId"
                  :show-toolbar="true"
                />
              </div>
              <div
                class="flex items-center justify-end border-t border-outline-gray-1 px-4 py-3"
              >
                <Button
                  variant="solid"
                  size="md"
                  class="!bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
                  :disabled="!commentHasContent || submittingComment"
                  :loading="submittingComment"
                  @click="postComment"
                >
                  Comment
                </Button>
              </div>
            </div>
            <ul v-if="comments.length" class="flex flex-col gap-4">
              <li
                v-for="c in comments"
                :key="c.name"
                class="flex items-start gap-4 rounded-md border border-outline-gray-1 bg-surface-white p-4"
              >
                <UserAvatar :email="c.comment_by || c.owner" size="md" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 text-sm text-ink-gray-6">
                    <span class="font-medium text-ink-gray-8">
                      {{ userName(c.comment_by || c.owner) }}
                    </span>
                    <span>{{ timeAgo(c.creation) }}</span>
                  </div>
                  <div
                    class="mt-2 text-base leading-relaxed text-ink-gray-8"
                    v-html="c.content"
                  />
                </div>
              </li>
            </ul>
            <p v-else class="text-base text-ink-gray-5">
              No comments yet. Start the conversation above.
            </p>
          </div>

          <div v-else-if="activeTab === 'activity'">
            <ul v-if="activity.length" class="flex flex-col gap-5">
              <li
                v-for="a in activity"
                :key="a.name"
                class="flex items-start gap-3"
              >
                <span
                  class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
                >
                  <History class="h-4 w-4 text-ink-gray-6" />
                </span>
                <div class="flex-1 min-w-0 text-base text-ink-gray-8">
                  <p>
                    <span class="font-medium">{{ userName(a.owner) }}</span>
                    {{ summarizeChange(a) }}
                  </p>
                  <p class="text-sm text-ink-gray-5">
                    {{ timeAgo(a.creation) }}
                  </p>
                </div>
              </li>
            </ul>
            <p v-else class="text-base text-ink-gray-5">
              No activity recorded yet.
            </p>
          </div>

          <div v-else-if="activeTab === 'attachments'">
            <AttachmentsTab :task-id="taskId" />
          </div>

          <div v-else-if="activeTab === 'transitions'">
            <TransitionsTab :task-id="taskId" :project-id="projectId" />
          </div>

          <div v-else-if="activeTab === 'history'">
            <HistoryTab :task-id="taskId" />
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-1 items-center justify-center text-sm text-ink-gray-5"
      >
        Loading task…
      </div>
    </div>

    <!-- Right sidebar -->
    <aside
      class="block w-96 flex-shrink-0 overflow-y-auto border-l border-outline-gray-1 bg-surface-white"
    >
      <div
        class="flex items-center justify-between border-b border-outline-gray-1 px-5 py-4"
      >
        <span class="text-base font-medium text-ink-gray-9">
          {{ task?.orbit_display_id || taskId }}
        </span>
        <div class="flex items-center gap-1.5">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-md border border-outline-gray-2 text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
            title="Copy link"
            @click="copyLink"
          >
            <Link2 class="h-4 w-4" />
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-md border border-outline-red-2 text-ink-red-5 hover:bg-surface-red-1"
            title="Delete"
            @click="confirmDelete"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="task" class="divide-y divide-outline-gray-1 px-4">
        <TaskDetailSidebarRow label="State" :icon="LayoutGrid">
          <Dropdown :options="stateOptions" placement="bottom-end">
            <template #default>
              <button
                class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2"
              >
                <span class="flex items-center gap-1.5 truncate">
                  <span
                    v-if="currentState"
                    class="h-2 w-2 rounded-full"
                    :style="{
                      backgroundColor: currentState.color || '#94A3B8',
                    }"
                  />
                  {{ currentState?.state_name || 'Set state' }}
                </span>
                <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
              </button>
            </template>
          </Dropdown>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Assignees" :icon="UserCircle">
          <div class="w-full" data-testid="sidebar-assignees">
            <Autocomplete
              multiple
              :options="userAutocompleteOptions"
              :modelValue="assigneeAutocompleteValue"
              placeholder="Unassigned"
              @update:modelValue="onAssigneesChange"
            />
          </div>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Priority" :icon="Signal">
          <Dropdown :options="priorityOptions" placement="bottom-end">
            <template #default>
              <button
                class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2"
              >
                <span class="flex items-center gap-1.5">
                  <Signal class="h-3.5 w-3.5 text-ink-gray-6" />
                  {{ task.priority || 'None' }}
                </span>
                <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
              </button>
            </template>
          </Dropdown>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Type" :icon="FileType">
          <Dropdown :options="typeOptions" placement="bottom-end">
            <template #default>
              <button
                class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2"
              >
                <span class="flex items-center gap-1.5">
                  <span
                    v-if="type"
                    class="flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white"
                    :style="{ backgroundColor: type.color || '#64748B' }"
                  >
                    {{ type.letter_prefix }}
                  </span>
                  {{ type?.type_name || 'Set type' }}
                </span>
                <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
              </button>
            </template>
          </Dropdown>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Parent" :icon="CornerDownRight">
          <button
            class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-gray-2 px-3 py-2 text-base text-ink-gray-5 cursor-not-allowed"
            title="Subtasks — coming soon"
            disabled
          >
            <span>Select task</span>
            <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
          </button>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Blocking" :icon="Flag">
          <button
            class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-gray-2 px-3 py-2 text-base text-ink-gray-5 cursor-not-allowed"
            title="Task links — coming soon"
            disabled
          >
            <span>Select tasks</span>
            <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
          </button>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Blocked by" :icon="FlagOff">
          <button
            class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-gray-2 px-3 py-2 text-base text-ink-gray-5 cursor-not-allowed"
            title="Task links — coming soon"
            disabled
          >
            <span>Select tasks</span>
            <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
          </button>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Start date" :icon="CalendarDays">
          <div data-testid="sidebar-start-date" class="w-full">
            <DatePicker
              :modelValue="localStartDate"
              placeholder="Start date"
              :formatter="(v) => v"
              input-class="w-full"
              @update:modelValue="
                (v) => {
                  localStartDate = v || ''
                  saveField('exp_start_date', v || null)
                }
              "
            />
          </div>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Due date" :icon="CalendarClock">
          <div data-testid="sidebar-due-date" class="w-full">
            <DatePicker
              :modelValue="localDueDate"
              placeholder="Due date"
              :formatter="(v) => v"
              input-class="w-full"
              @update:modelValue="
                (v) => {
                  localDueDate = v || ''
                  saveField('exp_end_date', v || null)
                }
              "
            />
          </div>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Reporter" :icon="UserPen">
          <Popover placement="bottom-end">
            <template #target="{ togglePopover }">
              <button
                class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2"
                data-testid="sidebar-reporter-trigger"
                @click="togglePopover"
              >
                <span v-if="!task.orbit_reporter" class="text-ink-gray-5">
                  Set reporter
                </span>
                <span v-else class="flex items-center gap-1.5 truncate">
                  <UserAvatar :email="task.orbit_reporter" size="xs" />
                  <span class="truncate">{{
                    userName(task.orbit_reporter)
                  }}</span>
                </span>
                <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
              </button>
            </template>
            <template #body="bodyProps">
              <div
                class="w-80 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
              >
                <div class="relative mb-2 flex items-center">
                  <Search
                    class="absolute left-2.5 h-3.5 w-3.5 text-ink-gray-5"
                  />
                  <input
                    v-model="reporterSearch"
                    type="text"
                    placeholder="Search users…"
                    class="h-9 w-full rounded border border-outline-gray-2 bg-surface-white pl-8 pr-2 text-base text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                  />
                </div>
                <div class="max-h-64 overflow-y-auto">
                  <button
                    v-if="task.orbit_reporter"
                    class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink-red-5 hover:bg-surface-red-1"
                    @click="onPickReporter('', bodyProps?.togglePopover)"
                  >
                    <X class="h-4 w-4" />
                    Clear reporter
                  </button>
                  <button
                    v-for="u in reporterFilteredUsers"
                    :key="u.name"
                    class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-surface-gray-2"
                    @click="onPickReporter(u.name, bodyProps?.togglePopover)"
                  >
                    <UserAvatar :email="u.name" :name="u.full_name" size="sm" />
                    <span class="truncate text-base text-ink-gray-8">
                      {{ u.full_name || u.name }}
                    </span>
                  </button>
                </div>
              </div>
            </template>
          </Popover>
        </TaskDetailSidebarRow>

        <TaskDetailSidebarRow label="Labels" :icon="Tag">
          <Popover placement="bottom-end">
            <template #target="{ togglePopover }">
              <button
                class="flex w-full items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2"
                data-testid="sidebar-labels-trigger"
                @click="togglePopover"
              >
                <span v-if="!labels.length" class="text-ink-gray-5">
                  Add labels
                </span>
                <span v-else class="flex flex-wrap items-center gap-1">
                  <span
                    v-for="(lbl, i) in labels.slice(0, 3)"
                    :key="i"
                    class="inline-flex items-center rounded bg-surface-gray-2 px-1.5 py-0.5 text-xs text-ink-gray-8"
                  >
                    {{ lbl }}
                  </span>
                  <span
                    v-if="labels.length > 3"
                    class="text-xs text-ink-gray-5"
                  >
                    +{{ labels.length - 3 }}
                  </span>
                </span>
                <ChevronDown class="h-3.5 w-3.5 text-ink-gray-5" />
              </button>
            </template>
            <template #body>
              <div
                class="w-80 rounded-md border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
                data-testid="sidebar-labels-body"
              >
                <div
                  v-if="labels.length"
                  class="mb-2 flex flex-wrap gap-1 border-b border-outline-gray-1 pb-2"
                >
                  <span
                    v-for="(lbl, i) in labels"
                    :key="i"
                    class="inline-flex items-center gap-1 rounded bg-surface-gray-2 px-2 py-0.5 text-sm text-ink-gray-8"
                  >
                    {{ lbl }}
                    <button
                      class="text-ink-gray-5 hover:text-ink-gray-9"
                      @click="removeLabel(lbl)"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <form
                  @submit.prevent="
                    () => {
                      addLabel(labelDraft)
                      labelDraft = ''
                    }
                  "
                >
                  <input
                    v-model="labelDraft"
                    type="text"
                    placeholder="Type a label and press Enter"
                    data-testid="sidebar-labels-input"
                    class="h-9 w-full rounded border border-outline-gray-2 bg-surface-white px-2 text-base text-ink-gray-8 placeholder-ink-gray-5 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                  />
                </form>
              </div>
            </template>
          </Popover>
        </TaskDetailSidebarRow>
      </div>

      <div
        v-if="task"
        class="border-t border-outline-gray-1 px-5 py-4 text-sm text-ink-gray-5"
      >
        <p v-if="task.creation">Created {{ timeAgo(task.creation) }}</p>
        <p v-if="task.modified" class="mt-1.5">
          Updated {{ timeAgo(task.modified) }}
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Autocomplete,
  Badge,
  Button,
  DatePicker,
  Dropdown,
  Popover,
  call,
  createResource,
  frappeRequest,
} from 'frappe-ui'
import ArrowLeft from '~icons/lucide/arrow-left'
import FolderClosed from '~icons/lucide/folder-closed'
import ChevronRight from '~icons/lucide/chevron-right'
import ChevronDown from '~icons/lucide/chevron-down'
import LayoutGrid from '~icons/lucide/layout-grid'
import UserCircle from '~icons/lucide/user-circle'
import Signal from '~icons/lucide/signal'
import FileType from '~icons/lucide/file-type'
import CornerDownRight from '~icons/lucide/corner-down-right'
import Flag from '~icons/lucide/flag'
import FlagOff from '~icons/lucide/flag-off'
import CalendarClock from '~icons/lucide/calendar-clock'
import CalendarDays from '~icons/lucide/calendar-days'
import UserPen from '~icons/lucide/user-pen'
import Tag from '~icons/lucide/tag'
import Link2 from '~icons/lucide/link-2'
import Trash2 from '~icons/lucide/trash-2'
import Plus from '~icons/lucide/plus'
import Search from '~icons/lucide/search'
import X from '~icons/lucide/x'
import History from '~icons/lucide/history'
import UserAvatar from '@/components/UserAvatar.vue'
import TaskDetailSidebarRow from '@/components/TaskDetailSidebarRow.vue'
import AttachmentsTab from '@/components/taskdetail/AttachmentsTab.vue'
import TransitionsTab from '@/components/taskdetail/TransitionsTab.vue'
import HistoryTab from '@/components/taskdetail/HistoryTab.vue'
import RichEditor from '@/components/editor/RichEditor.vue'
import { useWorkflowStatesForProject } from '@/stores/workflowStates'
import { useTaskTypesForWorkspace } from '@/stores/taskTypes'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'
import { useProjectsStore } from '@/stores/projects'
import { useUsers } from '@/stores/users'
import { useSessionStore } from '@/stores/session'

const props = defineProps({
  projectId: { type: String, required: true },
  taskId: { type: String, required: true },
})

const router = useRouter()
const states = useWorkflowStatesForProject(props.projectId)
const { currentWorkspace } = useCurrentWorkspace()
const taskTypes = useTaskTypesForWorkspace(currentWorkspace.value?.name)
const { projects } = useProjectsStore()
const users = useUsers()
const session = useSessionStore()

const tabs = [
  { key: 'comments', label: 'Comments' },
  { key: 'activity', label: 'Activity' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'history', label: 'History' },
]
const activeTab = ref('comments')

const taskResource = createResource({ url: 'frappe.client.get', auto: false })

// `frappe.client.get` returns doc.as_dict(), which omits the `_assign`
// meta-field — even `fields: ["*"]` on get_list drops it. It only comes back
// when asked for by name, so assignees need their own round-trip.
const assignResource = createResource({
  url: 'frappe.client.get_value',
  auto: false,
})

function loadTask() {
  taskResource.update({ params: { doctype: 'Task', name: props.taskId } })
  taskResource.fetch()
  assignResource.update({
    params: {
      doctype: 'Task',
      fieldname: '_assign',
      filters: { name: props.taskId },
    },
  })
  assignResource.fetch()
}
const task = computed(() => taskResource.data)

watch(() => props.taskId, loadTask, { immediate: true })

const localTitle = ref('')
const localDescription = ref('')
const localDueDate = ref('')
const localStartDate = ref('')

watch(
  task,
  (t) => {
    localTitle.value = t?.subject || ''
    localDescription.value = t?.description || ''
    localDueDate.value = t?.exp_end_date || ''
    localStartDate.value = t?.exp_start_date || ''
  },
  { immediate: true },
)

const project = computed(() =>
  (projects.data || []).find((p) => p.name === props.projectId),
)

const currentState = computed(() =>
  (states.data || []).find((s) => s.name === task.value?.orbit_workflow_state),
)

const type = computed(() =>
  (taskTypes.data || []).find((t) => t.name === task.value?.orbit_task_type),
)

const stateOptions = computed(() =>
  (states.data || []).map((s) => ({
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
  (taskTypes.data || []).map((t) => ({
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

const assignees = computed(() => {
  const raw = assignResource.data?._assign ?? task.value?._assign
  if (!raw) return []
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
})

const userAutocompleteOptions = computed(() =>
  (users.data || []).map((u) => ({
    label: u.full_name || u.name,
    value: u.name,
    description: u.full_name ? u.name : '',
  })),
)

const assigneeAutocompleteValue = computed(() =>
  assignees.value.map((email) => {
    const u = (users.data || []).find((x) => x.name === email)
    return {
      label: u?.full_name || email,
      value: email,
    }
  }),
)

async function onAssigneesChange(next) {
  const nextEmails = (next || [])
    .map((x) => (typeof x === 'object' ? x.value : x))
    .filter(Boolean)
  const current = assignees.value
  for (const email of nextEmails) {
    if (!current.includes(email)) await addAssignee(email)
  }
  for (const email of current) {
    if (!nextEmails.includes(email)) await removeAssignee(email)
  }
}

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

const reporterSearch = ref('')
const reporterFilteredUsers = computed(() => {
  const q = reporterSearch.value.trim().toLowerCase()
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

async function onPickReporter(email, togglePopover) {
  await saveField('orbit_reporter', email || null)
  if (typeof togglePopover === 'function') togglePopover()
}

const labels = computed(() => {
  const raw = task.value?.orbit_labels || ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
})
const labelDraft = ref('')

async function addLabel(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return
  const next = Array.from(new Set([...labels.value, trimmed]))
  await saveField('orbit_labels', next.join(', '))
}

async function removeLabel(name) {
  const next = labels.value.filter((l) => l !== name)
  await saveField('orbit_labels', next.join(', '))
}

function userName(email) {
  if (!email) return ''
  const u = (users.data || []).find((x) => x.name === email)
  return u?.full_name || email
}

async function addAssignee(email) {
  if (assignees.value.includes(email)) return
  try {
    await call('frappe.desk.form.assign_to.add', {
      doctype: 'Task',
      name: props.taskId,
      assign_to: [email],
    })
    flashSaved()
    loadTask()
  } catch (err) {
    console.error('add assignee failed', err)
  }
}

async function onPickAssignee(email, togglePopover) {
  await addAssignee(email)
  if (typeof togglePopover === 'function') togglePopover()
}

async function removeAssignee(email) {
  try {
    await call('frappe.desk.form.assign_to.remove', {
      doctype: 'Task',
      name: props.taskId,
      assign_to: email,
    })
    flashSaved()
    loadTask()
  } catch (err) {
    console.error('remove assignee failed', err)
  }
}

const dirty = ref(false)
const justSaved = ref(false)
let savedTimer = null

async function saveField(field, value) {
  if (!task.value) return
  if (task.value[field] === value) return
  dirty.value = true
  try {
    await createResource({
      url: 'frappe.client.set_value',
      params: {
        doctype: 'Task',
        name: props.taskId,
        fieldname: field,
        value,
      },
    }).submit()
    flashSaved()
    loadTask()
  } catch (err) {
    console.error(`Save failed for ${field}:`, err)
  } finally {
    dirty.value = false
  }
}

function flashSaved() {
  justSaved.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (justSaved.value = false), 1500)
}

function autoGrow(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

onMounted(async () => {
  await nextTick()
  const ta = document.querySelector('textarea[rows="1"]')
  if (ta) autoGrow({ target: ta })
  loadComments()
  loadActivity()
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
  } catch {
    /* ignore */
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({
      name: 'ProjectDetail',
      params: { projectId: props.projectId, tab: 'tasks' },
    })
  }
}

async function confirmDelete() {
  if (!confirm(`Delete ${task.value?.orbit_display_id || props.taskId}?`))
    return
  try {
    await createResource({
      url: 'frappe.client.delete',
      params: { doctype: 'Task', name: props.taskId },
    }).submit()
    router.push({
      name: 'ProjectDetail',
      params: { projectId: props.projectId, tab: 'tasks' },
    })
  } catch (err) {
    console.error('Delete failed:', err)
  }
}

const comments = ref([])
const commentDraft = ref('')
const submittingComment = ref(false)

// TipTap outputs <p></p> for an empty doc — strip tags before checking.
const commentHasContent = computed(
  () =>
    commentDraft.value.replace(/<[^>]*>/g, '').replace(/\s|&nbsp;/g, '')
      .length > 0,
)

async function loadComments() {
  try {
    const res = await frappeRequest({
      url: '/api/method/frappe.client.get_list',
      params: {
        doctype: 'Comment',
        filters: JSON.stringify([
          ['reference_doctype', '=', 'Task'],
          ['reference_name', '=', props.taskId],
          ['comment_type', '=', 'Comment'],
        ]),
        fields: JSON.stringify([
          'name',
          'content',
          'comment_by',
          'owner',
          'creation',
        ]),
        order_by: 'creation asc',
        limit_page_length: 100,
      },
    })
    comments.value = Array.isArray(res) ? res : res?.message || []
  } catch (err) {
    console.error('load comments failed', err)
    comments.value = []
  }
}

async function postComment() {
  if (!commentHasContent.value) return
  submittingComment.value = true
  try {
    await frappeRequest({
      url: '/api/method/frappe.desk.form.utils.add_comment',
      method: 'POST',
      params: {
        reference_doctype: 'Task',
        reference_name: props.taskId,
        // Submit HTML as-is (RichEditor outputs well-formed HTML). Mention
        // post-processing (notify mentioned users) is a follow-up — the
        // <span data-type="mention" data-id="<email>"> carries the payload.
        content: commentDraft.value,
        comment_email: session.user || 'Administrator',
        comment_by: session.fullName || session.user,
      },
    })
    commentDraft.value = ''
    loadComments()
    flashSaved()
  } catch (err) {
    console.error('post comment failed', err)
  } finally {
    submittingComment.value = false
  }
}

const activity = ref([])
async function loadActivity() {
  try {
    const res = await frappeRequest({
      url: '/api/method/frappe.client.get_list',
      params: {
        doctype: 'Version',
        filters: JSON.stringify([
          ['ref_doctype', '=', 'Task'],
          ['docname', '=', props.taskId],
        ]),
        fields: JSON.stringify(['name', 'owner', 'data', 'creation']),
        order_by: 'creation desc',
        limit_page_length: 50,
      },
    })
    activity.value = Array.isArray(res) ? res : res?.message || []
  } catch (err) {
    console.error('load activity failed', err)
    activity.value = []
  }
}

function summarizeChange(a) {
  try {
    const d = typeof a.data === 'string' ? JSON.parse(a.data) : a.data
    const changed = d?.changed || []
    if (!changed.length) return 'made an update'
    const fields = changed
      .map((c) => c[0])
      .slice(0, 3)
      .join(', ')
    return `changed ${fields}`
  } catch {
    return 'made an update'
  }
}

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Inline date-pill component (sidebar-width, inside a div wrapper)
const DatePillLike = {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Pick a date' },
    clearable: { type: Boolean, default: false },
    testid: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputRef = ref(null)
    const formatted = computed(() => {
      if (!props.modelValue) return ''
      const d = new Date(props.modelValue)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    })

    function open() {
      const el = inputRef.value
      if (!el) return
      try {
        if (typeof el.showPicker === 'function') el.showPicker()
        else el.focus()
      } catch {
        el.focus()
      }
    }

    return () =>
      h(
        'div',
        {
          class:
            'relative flex w-full cursor-pointer items-center gap-2 rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-base text-ink-gray-8 hover:bg-surface-gray-2',
          onClick: open,
          'data-testid': props.testid || undefined,
        },
        [
          h(
            'span',
            { class: props.modelValue ? 'flex-1' : 'flex-1 text-ink-gray-5' },
            props.modelValue ? formatted.value : props.placeholder,
          ),
          h('input', {
            ref: inputRef,
            type: 'date',
            // Visually invisible but still focusable + showPicker-able.
            // sr-only's `width:1px` + position:absolute are fine for that.
            class: 'sr-only',
            value: props.modelValue,
            onInput: (e) => emit('update:modelValue', e.target.value),
            onChange: (e) => emit('update:modelValue', e.target.value),
          }),
          props.clearable && props.modelValue
            ? h(
                'button',
                {
                  class:
                    'flex h-4 w-4 items-center justify-center rounded text-ink-gray-5 hover:bg-surface-gray-3 hover:text-ink-gray-9',
                  onClick: (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    emit('update:modelValue', '')
                  },
                },
                [h(X, { class: 'h-3 w-3' })],
              )
            : null,
        ],
      )
  },
}
</script>
