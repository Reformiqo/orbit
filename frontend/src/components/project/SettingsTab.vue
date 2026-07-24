<template>
  <div class="w-full px-10 py-8" data-testid="project-settings">
    <header class="mb-4">
      <h2 class="text-base font-medium text-ink-gray-9">Project settings</h2>
      <p class="mt-0.5 text-sm text-ink-gray-5">
        Changes save automatically when you leave each field.
      </p>
    </header>

    <form
      class="space-y-5 rounded-md border border-outline-gray-1 bg-surface-white p-5"
      @submit.prevent
    >
      <div @focusout="onFieldBlur('project_name', $event)">
        <FormControl
          v-model="form.project_name"
          label="Project name"
          :disabled="saving.project_name"
          placeholder="Mobile app"
          data-testid="settings-project-name"
        />
      </div>

      <div @focusout="onFieldBlur('orbit_identifier', $event)">
        <FormControl
          v-model="form.orbit_identifier"
          label="Identifier"
          :disabled="saving.orbit_identifier"
          placeholder="MOBILE"
          :maxlength="10"
          :description="identifierHelper"
          data-testid="settings-identifier"
          @input="onIdentifierInput"
        />
      </div>

      <div @focusout="onFieldBlur(DESCRIPTION_FIELD, $event)">
        <FormControl
          v-model="form[DESCRIPTION_FIELD]"
          type="textarea"
          :rows="4"
          label="Description"
          :disabled="saving[DESCRIPTION_FIELD]"
          placeholder="What is this project about?"
          data-testid="settings-description"
        />
      </div>

      <div class="space-y-1.5">
        <label
          for="settings-status-native"
          class="block text-xs text-ink-gray-6"
        >
          Status
        </label>
        <select
          id="settings-status-native"
          v-model="form.status"
          :disabled="saving.status"
          class="h-9 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-base text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none focus:ring-0"
          data-testid="settings-status"
          @change="save('status')"
        >
          <option
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <p
        v-if="saveError"
        class="text-sm text-ink-red-5"
        role="alert"
        data-testid="settings-error"
      >
        {{ saveError }}
      </p>
      <p
        v-else-if="lastSavedField"
        class="text-xs text-ink-gray-5"
        data-testid="settings-saved"
      >
        Saved "{{ labelFor(lastSavedField) }}".
      </p>
    </form>

    <!-- Danger zone -->
    <section
      class="mt-6 rounded-md border border-ink-red-3 bg-surface-white"
      data-testid="settings-danger-zone"
    >
      <header class="border-b border-outline-gray-1 px-5 py-3">
        <h3 class="text-sm font-medium text-ink-red-5">Danger zone</h3>
        <p class="mt-0.5 text-xs text-ink-gray-5">
          Destructive actions. Double-check before confirming.
        </p>
      </header>
      <div class="flex items-center justify-between px-5 py-4">
        <div>
          <p class="text-sm font-medium text-ink-gray-9">Delete project</p>
          <p class="mt-0.5 text-xs text-ink-gray-5">
            Permanently deletes this project. Tasks and pages attached to it may
            be orphaned.
          </p>
        </div>
        <Button
          variant="subtle"
          theme="red"
          class="!text-ink-red-5"
          data-testid="settings-delete-btn"
          @click="confirmOpen = true"
        >
          <template #prefix><Trash2 class="h-4 w-4" /></template>
          Delete project
        </Button>
      </div>
    </section>

    <Dialog
      v-model="confirmOpen"
      :options="{ title: 'Delete project?', size: 'md' }"
    >
      <template #body-content>
        <p class="text-sm text-ink-gray-7">
          This will permanently delete
          <strong>{{ form.project_name || projectId }}</strong
          >. This action cannot be undone.
        </p>
        <ErrorMessage v-if="deleteError" :message="deleteError" class="mt-3" />
      </template>
      <template #actions>
        <div class="flex justify-end gap-2">
          <Button variant="subtle" @click="confirmOpen = false">Cancel</Button>
          <Button
            variant="solid"
            theme="red"
            :loading="deleting"
            data-testid="settings-delete-confirm"
            @click="deleteProject"
          >
            Delete
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  Dialog,
  ErrorMessage,
  FormControl,
  createResource,
} from 'frappe-ui'
import Trash2 from '~icons/lucide/trash-2'
import { useProjectsStore } from '@/stores/projects'

const props = defineProps({
  projectId: { type: String, required: true },
  project: { type: Object, default: null },
})

const emit = defineEmits(['updated'])

const router = useRouter()
const { projects } = useProjectsStore()

const STATUS_OPTIONS = [
  { label: 'Open', value: 'Open' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
]

const IDENTIFIER_RE = /^[A-Z][A-Z0-9]{1,9}$/

// Project doctype stores long-form description in the `notes` Text Editor
// field (ERPNext default). We expose it in the UI as a simple textarea
// labelled "Description" and map it to that backend field.
const DESCRIPTION_FIELD = 'notes'

const form = reactive({
  project_name: '',
  orbit_identifier: '',
  [DESCRIPTION_FIELD]: '',
  status: 'Open',
})

const saving = reactive({
  project_name: false,
  orbit_identifier: false,
  [DESCRIPTION_FIELD]: false,
  status: false,
})

const saveError = ref('')
const lastSavedField = ref('')
const confirmOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

// --- hydrate from the parent-provided project, plus re-fetch description
// (the parent doesn't select that field in its lightweight load) ---

watch(
  () => props.project,
  (p) => {
    if (!p) return
    form.project_name = p.project_name || ''
    form.orbit_identifier = p.orbit_identifier || ''
    form.status = p.status || 'Open'
    if (typeof p[DESCRIPTION_FIELD] === 'string') {
      form[DESCRIPTION_FIELD] = p[DESCRIPTION_FIELD]
    }
  },
  { immediate: true, deep: true },
)

// Parent doesn't fetch the notes field in its lightweight load — grab it once.
const descResource = createResource({
  url: 'frappe.client.get_value',
  auto: false,
  transform: (d) => d,
})

watch(
  () => props.projectId,
  (id) => {
    if (!id) return
    descResource.update({
      params: {
        doctype: 'Project',
        filters: { name: id },
        fieldname: [DESCRIPTION_FIELD],
      },
    })
    descResource.fetch().then(() => {
      const val = descResource.data?.[DESCRIPTION_FIELD] ?? ''
      if (!form[DESCRIPTION_FIELD]) form[DESCRIPTION_FIELD] = val || ''
    })
  },
  { immediate: true },
)

const identifierHelper = computed(() => {
  if (!form.orbit_identifier)
    return 'Uppercase letters/digits, 2–10 chars, starts with a letter.'
  return IDENTIFIER_RE.test(form.orbit_identifier)
    ? ''
    : 'Invalid — 2–10 uppercase letters/digits, starts with a letter.'
})

function onIdentifierInput(e) {
  // FormControl emits the DOM input event — coerce to uppercase as the user types.
  const val = (e?.target?.value ?? '').toUpperCase()
  form.orbit_identifier = val
}

function onFieldBlur(field, event) {
  // focusout bubbles — only save when focus leaves the field wrapper entirely.
  const next = event?.relatedTarget
  if (next && event.currentTarget.contains(next)) return
  save(field)
}

function labelFor(field) {
  switch (field) {
    case 'project_name':
      return 'Project name'
    case 'orbit_identifier':
      return 'Identifier'
    case DESCRIPTION_FIELD:
      return 'Description'
    case 'status':
      return 'Status'
    default:
      return field
  }
}

function validate(field) {
  if (field === 'project_name' && !form.project_name.trim()) {
    return 'Project name is required.'
  }
  if (
    field === 'orbit_identifier' &&
    !IDENTIFIER_RE.test(form.orbit_identifier)
  ) {
    return 'Identifier must be 2–10 uppercase letters/digits, starting with a letter.'
  }
  return ''
}

async function save(field) {
  saveError.value = ''
  const err = validate(field)
  if (err) {
    saveError.value = err
    return
  }
  const value = form[field]
  // Skip save if nothing changed vs the source-of-truth prop.
  const current = props.project?.[field]
  if (current !== undefined && current === value) return

  saving[field] = true
  try {
    await createResource({
      url: 'frappe.client.set_value',
      params: {
        doctype: 'Project',
        name: props.projectId,
        fieldname: field,
        value,
      },
    }).submit()
    lastSavedField.value = field
    projects.reload?.()
    emit('updated', { field, value })
  } catch (e) {
    saveError.value =
      e?.messages?.[0] || e?.message || `Could not save ${labelFor(field)}.`
  } finally {
    saving[field] = false
  }
}

async function deleteProject() {
  deleteError.value = ''
  deleting.value = true
  try {
    // Project.before_delete (orbit.overrides.project) cascades linked Tasks,
    // Orbit Workflow States, Pages, ToDos, Comments, and Notification Logs.
    await createResource({
      url: 'frappe.client.delete',
      params: { doctype: 'Project', name: props.projectId },
    }).submit()
    projects.reload?.()
    confirmOpen.value = false
    router.push({ name: 'Projects' })
  } catch (e) {
    deleteError.value =
      e?.messages?.[0] || e?.message || 'Could not delete project.'
  } finally {
    deleting.value = false
  }
}
</script>
