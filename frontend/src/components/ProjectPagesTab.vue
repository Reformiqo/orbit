<template>
  <div class="flex h-full w-full" data-testid="project-pages-tab">
    <PageTree
      :pages="pages.data || []"
      :active-id="activePageId"
      :loading="loadingTree"
      @select="selectPage"
      @create="createPage()"
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Empty state when no page selected -->
      <div
        v-if="!activePageId || !activePage"
        class="flex flex-1 items-center justify-center"
        data-testid="pages-empty-state"
      >
        <div class="text-center">
          <FileText class="mx-auto h-12 w-12 text-ink-gray-5" />
          <h2 class="mt-3 text-xl font-medium text-ink-gray-9">
            {{ (pages.data || []).length ? 'Pick a page' : 'No pages yet' }}
          </h2>
          <p class="mt-1.5 text-base text-ink-gray-5">
            {{
              (pages.data || []).length
                ? 'Select a page from the tree on the left.'
                : 'Create your first page to start a wiki for this project.'
            }}
          </p>
          <Button
            variant="solid"
            class="mt-4 !h-9 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
            data-testid="pages-create-first"
            @click="createPage()"
          >
            <template #prefix><Plus class="h-4 w-4" /></template>
            New page
          </Button>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <!-- Page header -->
        <header
          class="flex items-center gap-2 border-b border-outline-gray-1 px-6 py-3"
        >
          <input
            v-model="title"
            type="text"
            class="flex-1 bg-transparent text-2xl font-semibold text-ink-gray-9 placeholder-ink-gray-4 focus:outline-none"
            placeholder="Untitled"
            data-testid="page-title-input"
            @input="scheduleSave"
            @blur="saveNow"
          />

          <span
            v-if="savedAt"
            class="hidden text-sm text-ink-gray-5 sm:inline"
            data-testid="page-save-indicator"
          >
            {{ saveLabel }}
          </span>

          <button
            class="ml-1 flex h-9 w-9 items-center justify-center rounded text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
            data-testid="page-new-child"
            title="New child page"
            @click="createPage(activePageId)"
          >
            <Plus class="h-5 w-5" />
          </button>

          <Popover placement="bottom-end">
            <template #target="{ togglePopover }">
              <button
                class="flex h-9 w-9 items-center justify-center rounded text-ink-gray-6 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
                data-testid="page-actions-btn"
                title="More actions"
                @click="togglePopover"
              >
                <MoreHorizontal class="h-5 w-5" />
              </button>
            </template>
            <template #body="{ close }">
              <div
                class="w-48 rounded-md border border-outline-gray-2 bg-surface-white py-1.5 shadow-lg"
              >
                <button
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-base text-ink-gray-8 hover:bg-surface-gray-2"
                  data-testid="page-archive-btn"
                  @click="
                    () => {
                      toggleArchive()
                      close()
                    }
                  "
                >
                  <Archive class="h-4 w-4" />
                  {{ activePage.is_archived ? 'Unarchive' : 'Archive' }}
                </button>
                <button
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-base text-ink-red-500 hover:bg-surface-gray-2"
                  data-testid="page-delete-btn"
                  @click="
                    () => {
                      deletePage()
                      close()
                    }
                  "
                >
                  <Trash class="h-4 w-4" />
                  Delete
                </button>
              </div>
            </template>
          </Popover>
        </header>

        <!-- Banner when archived -->
        <div
          v-if="activePage.is_archived"
          class="border-b border-outline-gray-1 bg-surface-gray-2 px-6 py-1.5 text-sm text-ink-gray-6"
        >
          This page is archived.
        </div>

        <!-- Editor -->
        <div class="min-h-0 flex-1">
          <RichEditor
            :key="activePageId"
            v-model="content"
            profile="page"
            placeholder="Start writing…"
            @change="scheduleSave"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Popover, call } from 'frappe-ui'
import Plus from '~icons/lucide/plus'
import FileText from '~icons/lucide/file-text'
import MoreHorizontal from '~icons/lucide/more-horizontal'
import Archive from '~icons/lucide/archive'
import Trash from '~icons/lucide/trash-2'
import PageTree from '@/components/PageTree.vue'
import RichEditor from '@/components/editor/RichEditor.vue'
import { usePagesForProject } from '@/stores/pages'

const props = defineProps({
  projectId: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()

const pages = usePagesForProject(props.projectId)

const loadingTree = computed(() => pages.loading && !pages.data)

const activePageId = computed(() => route.params.pageId || '')

const activePage = computed(() =>
  (pages.data || []).find((p) => p.name === activePageId.value),
)

// Auto-pick first page when none is selected and pages exist
watch(
  () => [pages.data, activePageId.value],
  ([list, id]) => {
    if (!list || id) return
    const alive = list.filter((p) => !p.is_archived)
    if (alive.length) {
      router.replace({
        name: 'ProjectDetail',
        params: { projectId: props.projectId, tab: 'pages', pageId: alive[0].name },
      })
    }
  },
  { immediate: true },
)

// Local editing buffer — updated from activePage when page changes
const title = ref('')
const content = ref('')
const savedAt = ref(null)
let saveTimer = null

watch(
  () => activePageId.value,
  async (id) => {
    cancelPending()
    if (!id) {
      title.value = ''
      content.value = ''
      return
    }
    // Pull fresh doc to get full content (list resource excludes content field)
    await loadFullPage(id)
  },
  { immediate: true },
)

async function loadFullPage(id) {
  try {
    const url =
      `/api/method/frappe.client.get?doctype=Orbit+Page` +
      `&name=${encodeURIComponent(id)}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return
    const body = await res.json()
    const doc = body.message
    if (!doc || doc.name !== id) return
    title.value = doc.title || ''
    content.value = doc.content || ''
    savedAt.value = null
  } catch (err) {
    console.warn('[pages] load error', err)
  }
}

function scheduleSave() {
  cancelPending()
  saveTimer = window.setTimeout(() => {
    saveNow()
  }, 1000)
}

function cancelPending() {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
    saveTimer = null
  }
}

async function saveNow() {
  cancelPending()
  if (!activePageId.value) return
  const cur = activePage.value
  if (!cur) return
  const patch = {
    title: title.value,
    content: content.value,
  }
  try {
    await call('frappe.client.set_value', {
      doctype: 'Orbit Page',
      name: activePageId.value,
      fieldname: patch,
    })
    savedAt.value = new Date()
    pages.reload()
  } catch (err) {
    console.warn('[pages] save error', err)
  }
}

const saveLabel = computed(() => {
  if (!savedAt.value) return ''
  const diff = Math.max(0, Date.now() - savedAt.value.getTime())
  if (diff < 2000) return 'Saved'
  const mins = Math.floor(diff / 60000)
  if (mins === 0) return 'Saved a moment ago'
  if (mins === 1) return 'Saved 1 minute ago'
  return `Saved ${mins} minutes ago`
})

async function createPage(parentId = null) {
  const doc = {
    doctype: 'Orbit Page',
    title: 'Untitled',
    project: props.projectId,
    content: '',
  }
  if (parentId) doc.parent_page = parentId
  try {
    const created = await call('frappe.client.insert', { doc })
    if (!created || !created.name) return
    await pages.reload()
    selectPage(created.name)
  } catch (err) {
    console.warn('[pages] create error', err)
  }
}

function selectPage(id) {
  // Flush pending save before switching
  saveNow()
  router.push({
    name: 'ProjectDetail',
    params: { projectId: props.projectId, tab: 'pages', pageId: id },
  })
}

async function toggleArchive() {
  if (!activePage.value) return
  const next = activePage.value.is_archived ? 0 : 1
  try {
    await call('frappe.client.set_value', {
      doctype: 'Orbit Page',
      name: activePage.value.name,
      fieldname: 'is_archived',
      value: next,
    })
    await pages.reload()
  } catch (err) {
    console.warn('[pages] archive error', err)
  }
}

async function deletePage() {
  if (!activePage.value) return
  if (!window.confirm(`Delete "${activePage.value.title || 'this page'}"?`)) return
  const children = (pages.data || []).filter(
    (p) => p.parent_page === activePage.value.name,
  )
  if (children.length) {
    if (
      !window.confirm(
        `This page has ${children.length} child page(s). They will become top-level pages.`,
      )
    )
      return
    for (const c of children) {
      await call('frappe.client.set_value', {
        doctype: 'Orbit Page',
        name: c.name,
        fieldname: 'parent_page',
        value: '',
      })
    }
  }
  try {
    await call('frappe.client.delete', {
      doctype: 'Orbit Page',
      name: activePage.value.name,
    })
    await pages.reload()
    router.replace({
      name: 'ProjectDetail',
      params: { projectId: props.projectId, tab: 'pages' },
    })
  } catch (err) {
    console.warn('[pages] delete error', err)
  }
}

onBeforeUnmount(() => {
  saveNow()
})
</script>
