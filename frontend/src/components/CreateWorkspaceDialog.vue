<template>
  <Dialog v-model="isOpen" :options="{ title: 'Create workspace', size: 'md' }">
    <template #body-content>
      <form class="space-y-4" @submit.prevent="submit">
        <FormControl
          ref="nameInput"
          v-model="form.workspace_name"
          label="Workspace name"
          :required="true"
          placeholder="Acme Inc."
          @input="onNameInput"
        />
        <FormControl
          v-model="form.slug"
          label="URL slug"
          :required="true"
          placeholder="acme"
          :description="slugHelperText"
        />
        <FormControl
          v-model="form.icon"
          label="Icon (optional)"
          placeholder="🚀"
          :maxlength="4"
        />
        <FormControl
          v-model="form.description"
          type="textarea"
          label="Description (optional)"
          placeholder="What this workspace is for."
        />
        <ErrorMessage v-if="errorMessage" :message="errorMessage" />
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button variant="subtle" @click="close">Cancel</Button>
        <Button variant="solid" :loading="submitting" @click="submit">
          Create workspace
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
import { useWorkspacesStore } from '@/stores/workspaces'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { workspaces } = useWorkspacesStore()

const form = reactive({
  workspace_name: '',
  slug: '',
  icon: '',
  description: '',
})

const slugTouched = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const nameInput = ref(null)

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/

const slugHelperText = computed(() => {
  if (!form.slug) return 'Lowercase letters, digits, hyphens. 1–40 characters.'
  return SLUG_RE.test(form.slug)
    ? ''
    : 'Invalid — lowercase letters/digits/hyphens only, no leading/trailing hyphen.'
})

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function onNameInput(e) {
  if (!slugTouched.value) {
    form.slug = slugify(e.target.value)
  }
}

watch(
  () => form.slug,
  (_, old) => {
    if (old) slugTouched.value = true
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
  form.workspace_name = ''
  form.slug = ''
  form.icon = ''
  form.description = ''
  slugTouched.value = false
  errorMessage.value = ''
  submitting.value = false
}

function close() {
  isOpen.value = false
}

async function submit() {
  errorMessage.value = ''
  if (!form.workspace_name.trim()) {
    errorMessage.value = 'Workspace name is required.'
    return
  }
  if (!SLUG_RE.test(form.slug)) {
    errorMessage.value = 'Slug must be lowercase letters, digits, or hyphens.'
    return
  }

  submitting.value = true
  try {
    const created = await createResource({
      url: 'frappe.client.insert',
      params: {
        doc: {
          doctype: 'Orbit Workspace',
          workspace_name: form.workspace_name.trim(),
          slug: form.slug,
          icon: form.icon || null,
          description: form.description || null,
        },
      },
    }).submit()
    workspaces.reload()
    emit('created', created)
    close()
  } catch (err) {
    errorMessage.value =
      err?.messages?.[0] || err?.message || 'Could not create workspace.'
  } finally {
    submitting.value = false
  }
}
</script>
