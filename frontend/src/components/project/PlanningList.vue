<template>
  <div class="h-full overflow-auto" :data-testid="cfg.testId">
    <!-- Empty state -->
    <RichEmptyState
      v-if="!loading && !rows.length"
      :test-id="`${cfg.testId}-empty`"
      :icon="cfg.icon"
      :title="cfg.emptyTitle"
      :description="cfg.emptyDescription"
      :cta-label="`Create ${cfg.label.toLowerCase()}`"
      :cta-icon="Plus"
      @cta="openCreate"
    />

    <div
      v-else-if="loading"
      class="flex h-full items-center justify-center text-sm text-ink-gray-5"
    >
      Loading {{ cfg.plural.toLowerCase() }}…
    </div>

    <!-- List -->
    <div v-else>
      <header
        class="flex items-center gap-2 border-b border-outline-gray-1 bg-surface-menu-bar px-5 py-2"
      >
        <component :is="cfg.icon" class="h-3.5 w-3.5 text-ink-gray-6" />
        <span class="text-sm font-medium text-ink-gray-9">{{
          cfg.plural
        }}</span>
        <span class="text-xs text-ink-gray-5">{{ rows.length }}</span>
        <span class="flex-1" />
        <span class="w-44 text-right text-xs text-ink-gray-5">Progress</span>
        <span class="w-40 text-right text-xs text-ink-gray-5">
          {{ cfg.showStartDate ? 'Runs' : 'Target' }}
        </span>
      </header>

      <ul class="divide-y divide-outline-gray-1">
        <li
          v-for="row in rows"
          :key="row.name"
          class="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-gray-2"
          :data-testid="`${cfg.testId}-row`"
          @click="openEdit(row)"
        >
          <span
            class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            :style="{ backgroundColor: row.color || statusColor(row.status) }"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm text-ink-gray-9">
                {{ row[cfg.nameField] }}
              </span>
              <Badge
                :theme="statusTheme(row.status)"
                variant="subtle"
                size="sm"
              >
                {{ row.status }}
              </Badge>
              <span
                v-if="isOverdue(row)"
                class="text-xs font-medium text-ink-red-5"
                :data-testid="`${cfg.testId}-overdue`"
              >
                Overdue
              </span>
            </div>
            <p
              v-if="row.description"
              class="mt-0.5 truncate text-xs text-ink-gray-5"
            >
              {{ row.description }}
            </p>
          </div>

          <!-- Progress -->
          <div class="flex w-44 flex-shrink-0 items-center gap-2">
            <div class="h-1.5 flex-1 rounded-full bg-surface-gray-3">
              <div
                class="h-1.5 rounded-full bg-ink-gray-8 transition-all"
                :style="{ width: `${row.progress}%` }"
              />
            </div>
            <span
              class="w-20 text-right text-xs tabular-nums text-ink-gray-5"
              :data-testid="`${cfg.testId}-progress`"
            >
              {{ row.done }}/{{ countable(row) }} · {{ row.progress }}%
            </span>
          </div>

          <span
            class="w-40 flex-shrink-0 text-right text-xs tabular-nums text-ink-gray-5"
            :data-testid="`${cfg.testId}-target`"
          >
            {{ dateRange(row) }}
          </span>
        </li>
      </ul>

      <button
        class="flex w-full items-center gap-2 px-5 py-2.5 text-sm text-ink-gray-5 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
        :data-testid="`${cfg.testId}-new`"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        New {{ cfg.label.toLowerCase() }}
      </button>
    </div>

    <!-- Create / edit dialog -->
    <Dialog
      v-model="dialogOpen"
      :options="{
        title: editing
          ? `Edit ${cfg.label.toLowerCase()}`
          : `New ${cfg.label.toLowerCase()}`,
        size: 'lg',
      }"
    >
      <template #body-content>
        <div class="space-y-4" :data-testid="`${cfg.testId}-dialog`">
          <FormControl
            v-model="form.title"
            :label="`${cfg.label} name`"
            :placeholder="cfg.namePlaceholder"
            :data-testid="`${cfg.testId}-name-input`"
            @keyup.enter="save"
          />

          <FormControl
            v-model="form.description"
            type="textarea"
            :rows="3"
            label="Description"
            placeholder="What outcome does this work toward?"
          />

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs text-ink-gray-6">Status</label>
              <select
                v-model="form.status"
                class="h-9 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-base text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
                :data-testid="`${cfg.testId}-status-input`"
              >
                <option v-for="s in cfg.statuses" :key="s" :value="s">
                  {{ s }}
                </option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs text-ink-gray-6">Lead</label>
              <select
                v-model="form.lead"
                class="h-9 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-base text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
              >
                <option value="">Unassigned</option>
                <option v-for="u in userOptions" :key="u.name" :value="u.name">
                  {{ u.full_name || u.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <FormControl
              v-if="cfg.showStartDate"
              v-model="form.start_date"
              type="date"
              label="Start date"
            />
            <FormControl
              v-model="form.target_date"
              type="date"
              label="Target date"
              :data-testid="`${cfg.testId}-target-input`"
            />
            <FormControl
              v-if="!cfg.showStartDate"
              v-model="form.color"
              label="Colour"
              placeholder="#3B82F6"
              :maxlength="9"
            />
          </div>

          <FormControl
            v-if="cfg.showStartDate"
            v-model="form.color"
            label="Colour"
            placeholder="#3B82F6"
            :maxlength="9"
          />

          <ErrorMessage v-if="error" :message="error" />
        </div>
      </template>

      <template #actions>
        <div class="flex items-center justify-between">
          <Button
            v-if="editing"
            variant="subtle"
            theme="red"
            class="!text-ink-red-5"
            :loading="deleting"
            :data-testid="`${cfg.testId}-delete`"
            @click="remove"
          >
            <template #prefix><Trash2 class="h-4 w-4" /></template>
            Delete
          </Button>
          <span v-else />
          <div class="flex gap-2">
            <Button variant="subtle" @click="dialogOpen = false">Cancel</Button>
            <Button
              variant="solid"
              class="!bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
              :loading="saving"
              :data-testid="`${cfg.testId}-save`"
              @click="save"
            >
              {{ editing ? 'Save' : 'Create' }}
            </Button>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  FormControl,
  createResource,
} from 'frappe-ui'
import Package from '~icons/lucide/package'
import Target from '~icons/lucide/target'
import Plus from '~icons/lucide/plus'
import Trash2 from '~icons/lucide/trash-2'
import RichEmptyState from './RichEmptyState.vue'
import { usePlanning } from '@/stores/planning'
import { useUsers } from '@/stores/users'

const props = defineProps({
  projectId: { type: String, required: true },
  kind: {
    type: String,
    required: true,
    validator: (v) => ['module', 'milestone'].includes(v),
  },
})

const CONFIG = {
  module: {
    doctype: 'Orbit Module',
    nameField: 'module_name',
    label: 'Module',
    plural: 'Modules',
    icon: Package,
    testId: 'project-modules',
    namePlaceholder: 'Billing',
    showStartDate: true,
    statuses: ['Planned', 'In Progress', 'Paused', 'Completed', 'Cancelled'],
    emptyTitle: 'No modules yet',
    emptyDescription:
      'A module is a cross-cycle bucket of tasks working toward a shared outcome — like Billing, Onboarding, or Mobile. Use modules to group related work that spans multiple sprints or releases.',
  },
  milestone: {
    doctype: 'Orbit Milestone',
    nameField: 'milestone_name',
    label: 'Milestone',
    plural: 'Milestones',
    icon: Target,
    testId: 'project-milestones',
    namePlaceholder: 'Public beta',
    showStartDate: false,
    statuses: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
    emptyTitle: 'No milestones yet',
    emptyDescription:
      "A milestone is a goal-based checkpoint with an optional target date — like 'Public beta' or 'v1.0 launch'. Track progress by attaching tasks that must complete before the milestone is reached.",
  },
}

const cfg = computed(() => CONFIG[props.kind])

const planning = computed(() => usePlanning(props.projectId))
const resource = computed(() =>
  props.kind === 'module' ? planning.value.modules : planning.value.milestones,
)

const rows = computed(() => resource.value.data || [])
const loading = computed(() => resource.value.loading && !resource.value.data)

const users = useUsers()
const userOptions = computed(() => users.data || [])

const dialogOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  description: '',
  status: 'Planned',
  lead: '',
  start_date: '',
  target_date: '',
  color: '',
})

// --- display helpers -------------------------------------------------

const STATUS_THEMES = {
  Planned: 'gray',
  'In Progress': 'orange',
  Paused: 'gray',
  Completed: 'green',
  Cancelled: 'red',
}

const STATUS_COLORS = {
  Planned: '#94A3B8',
  'In Progress': '#F59E0B',
  Paused: '#64748B',
  Completed: '#10B981',
  Cancelled: '#EF4444',
}

function statusTheme(status) {
  return STATUS_THEMES[status] || 'gray'
}

function statusColor(status) {
  return STATUS_COLORS[status] || '#94A3B8'
}

// Cancelled tasks are excluded from the denominator, matching the server.
function countable(row) {
  return Math.max((row.total || 0) - (row.dropped || 0), 0)
}

function isOverdue(row) {
  if (!row.target_date) return false
  if (row.status === 'Completed' || row.status === 'Cancelled') return false
  return new Date(row.target_date) < new Date(new Date().toDateString())
}

function formatDate(value, withYear = true) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/**
 * A module is a span, so show "starts → ends" when both are known; that is what
 * tells someone which module to pick up first. A milestone is a single date.
 */
function dateRange(row) {
  if (!cfg.value.showStartDate || !row.start_date) {
    return formatDate(row.target_date)
  }
  if (!row.target_date) return `from ${formatDate(row.start_date)}`
  const sameYear =
    new Date(row.start_date).getFullYear() ===
    new Date(row.target_date).getFullYear()
  return `${formatDate(row.start_date, !sameYear)} → ${formatDate(row.target_date)}`
}

// --- CRUD ------------------------------------------------------------

function reset() {
  form.title = ''
  form.description = ''
  form.status = 'Planned'
  form.lead = ''
  form.start_date = ''
  form.target_date = ''
  form.color = ''
  error.value = ''
}

function openCreate() {
  reset()
  editing.value = null
  dialogOpen.value = true
}

function openEdit(row) {
  reset()
  editing.value = row
  form.title = row[cfg.value.nameField] || ''
  form.description = row.description || ''
  form.status = row.status || 'Planned'
  form.lead = row.lead || ''
  form.start_date = row.start_date || ''
  form.target_date = row.target_date || ''
  form.color = row.color || ''
  dialogOpen.value = true
}

function payload() {
  const data = {
    [cfg.value.nameField]: form.title.trim(),
    project: props.projectId,
    status: form.status,
    lead: form.lead || null,
    description: form.description || null,
    target_date: form.target_date || null,
    color: form.color || null,
  }
  if (cfg.value.showStartDate) data.start_date = form.start_date || null
  return data
}

async function save() {
  error.value = ''
  if (!form.title.trim()) {
    error.value = `${cfg.value.label} name is required.`
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await createResource({
        url: 'frappe.client.set_value',
        params: {
          doctype: cfg.value.doctype,
          name: editing.value.name,
          fieldname: payload(),
        },
      }).submit()
    } else {
      await createResource({
        url: 'frappe.client.insert',
        params: { doc: { doctype: cfg.value.doctype, ...payload() } },
      }).submit()
    }
    dialogOpen.value = false
    resource.value.reload()
  } catch (e) {
    error.value =
      e?.messages?.[0] ||
      e?.message ||
      `Could not save ${cfg.value.label.toLowerCase()}.`
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value) return
  error.value = ''
  deleting.value = true
  try {
    // on_trash detaches tasks first, so the work inside survives the delete.
    await createResource({
      url: 'frappe.client.delete',
      params: { doctype: cfg.value.doctype, name: editing.value.name },
    }).submit()
    dialogOpen.value = false
    resource.value.reload()
  } catch (e) {
    error.value =
      e?.messages?.[0] ||
      e?.message ||
      `Could not delete ${cfg.value.label.toLowerCase()}.`
  } finally {
    deleting.value = false
  }
}
</script>
