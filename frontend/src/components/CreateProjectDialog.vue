<template>
  <Dialog v-model="isOpen" :options="{ title: 'Create project', size: 'md' }">
    <template #body-content>
      <form class="space-y-4" @submit.prevent="submit">
        <FormControl
          ref="nameInput"
          v-model="form.project_name"
          label="Project name"
          :required="true"
          placeholder="Mobile application"
          @input="onNameInput"
        />
        <FormControl
          v-model="form.orbit_identifier"
          label="Identifier"
          :required="true"
          placeholder="MOBILE"
          :maxlength="10"
          :description="identifierHelperText"
          @input="onIdentifierInput"
        />
        <ErrorMessage v-if="errorMessage" :message="errorMessage" />
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button variant="subtle" @click="close">Cancel</Button>
        <Button variant="solid" :loading="submitting" @click="submit">
          Create project
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  Button,
  Dialog,
  FormControl,
  ErrorMessage,
  createResource,
} from 'frappe-ui'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'
import { useProjectsStore } from '@/stores/projects'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { currentWorkspace } = useCurrentWorkspace()
const { projects } = useProjectsStore()

const form = reactive({
  project_name: '',
  orbit_identifier: '',
})

const identifierTouched = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const nameInput = ref(null)

const IDENTIFIER_RE = /^[A-Z][A-Z0-9]{1,9}$/

const identifierHelperText = computed(() => {
  if (!form.orbit_identifier)
    return 'Uppercase letters/digits, 2–10 characters, starts with a letter. Used as task ID prefix.'
  return IDENTIFIER_RE.test(form.orbit_identifier)
    ? ''
    : 'Invalid — 2–10 uppercase letters/digits, starts with a letter.'
})

function deriveIdentifier(name) {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10) || ''
  )
}

function onNameInput(e) {
  if (!identifierTouched.value) {
    form.orbit_identifier = deriveIdentifier(e.target.value)
  }
}

function onIdentifierInput(e) {
  form.orbit_identifier = e.target.value.toUpperCase()
}

watch(
  () => form.orbit_identifier,
  (_, old) => {
    if (old) identifierTouched.value = true
  },
)

watch(isOpen, async (open) => {
  if (open) {
    reset()
    await nextTick()
    nameInput.value?.$el?.querySelector('input')?.focus()
  }
})

function reset() {
  form.project_name = ''
  form.orbit_identifier = ''
  identifierTouched.value = false
  errorMessage.value = ''
  submitting.value = false
}

function close() {
  isOpen.value = false
}

async function submit() {
  errorMessage.value = ''
  if (!form.project_name.trim()) {
    errorMessage.value = 'Project name is required.'
    return
  }
  if (!IDENTIFIER_RE.test(form.orbit_identifier)) {
    errorMessage.value = 'Identifier must be 2–10 uppercase letters/digits.'
    return
  }
  if (!currentWorkspace.value?.name) {
    errorMessage.value = 'No active workspace — refresh and try again.'
    return
  }

  submitting.value = true
  try {
    const created = await createResource({
      url: 'frappe.client.insert',
      params: {
        doc: {
          doctype: 'Project',
          project_name: form.project_name.trim(),
          orbit_identifier: form.orbit_identifier,
          orbit_workspace: currentWorkspace.value.name,
        },
      },
    }).submit()
    projects.reload()
    emit('created', created)
    close()
  } catch (err) {
    errorMessage.value =
      err?.messages?.[0] || err?.message || 'Could not create project.'
  } finally {
    submitting.value = false
  }
}
</script>
