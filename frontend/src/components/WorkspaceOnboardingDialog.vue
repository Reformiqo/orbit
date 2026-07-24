<template>
  <Dialog
    v-model="open"
    :options="{
      title: 'Welcome to Orbit',
      size: 'md',
      dismissable: false,
    }"
    :dismissable="false"
    persistent
  >
    <template #body>
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center gap-3">
          <OrbitMark class="h-11 w-11 flex-shrink-0 rounded-md" />
          <div>
            <h2 class="text-xl font-semibold text-ink-gray-9">
              Let's create your workspace
            </h2>
            <p class="text-base text-ink-gray-6">
              Your workspace is where your team's projects, pages, and tasks
              live.
            </p>
          </div>
        </div>
      </div>

      <form class="space-y-4 px-6 pb-6" @submit.prevent="submit">
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
        <ErrorMessage v-if="errorMessage" :message="errorMessage" />
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end">
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
import OrbitMark from '@/components/OrbitMark.vue'
import { useWorkspacesStore } from '@/stores/workspaces'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'

const { workspaces } = useWorkspacesStore()
const { needsOnboarding } = useCurrentWorkspace()

// Dialog is open iff onboarding is needed. Non-dismissable — it can only
// close by a successful create.
const open = computed({
  get: () => needsOnboarding.value,
  set: () => {
    /* swallow external close attempts */
  },
})

const form = reactive({
  workspace_name: '',
  slug: '',
  icon: '',
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

watch(
  () => needsOnboarding.value,
  async (show) => {
    if (show) {
      await nextTick()
      nameInput.value?.$el?.querySelector('input')?.focus()
    }
  },
  { immediate: true },
)

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
    await createResource({
      url: 'frappe.client.insert',
      params: {
        doc: {
          doctype: 'Orbit Workspace',
          workspace_name: form.workspace_name.trim(),
          slug: form.slug,
          icon: form.icon || null,
        },
      },
    }).submit()
    workspaces.reload()
  } catch (err) {
    errorMessage.value =
      err?.messages?.[0] || err?.message || 'Could not create workspace.'
  } finally {
    submitting.value = false
  }
}
</script>
