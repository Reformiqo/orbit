<template>
  <div class="flex h-full w-full flex-col">
    <!-- Header -->
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-6 py-4"
    >
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-medium text-ink-gray-9">Workspaces</h1>
        <span class="text-lg text-ink-gray-5">/</span>
        <span class="text-base text-ink-gray-6">All</span>
      </div>
      <Button
        variant="solid"
        class="!h-9 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
        data-testid="workspaces-create-btn"
        @click="showCreate = true"
      >
        <template #prefix><Plus class="h-4 w-4" /></template>
        Create
      </Button>
    </header>

    <!-- Body -->
    <div class="flex-1 overflow-auto">
      <!-- Loading -->
      <div
        v-if="workspaces.loading && !workspaces.data"
        class="flex h-full items-center justify-center text-base text-ink-gray-5"
      >
        Loading workspaces…
      </div>

      <!-- Empty -->
      <div
        v-else-if="!workspaces.data || workspaces.data.length === 0"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center">
          <FolderKanban class="mx-auto h-10 w-10 text-ink-gray-5" />
          <h2 class="mt-3 text-xl font-medium text-ink-gray-9">
            No workspaces yet
          </h2>
          <p class="mt-1.5 text-base text-ink-gray-5">
            Create your first workspace to start tracking projects.
          </p>
          <Button
            variant="solid"
            class="mt-4 !h-9 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
            @click="showCreate = true"
          >
            <template #prefix><Plus class="h-4 w-4" /></template>
            Create workspace
          </Button>
        </div>
      </div>

      <!-- List -->
      <ul
        v-else
        class="divide-y divide-outline-gray-1"
        data-testid="workspaces-list"
      >
        <li
          v-for="ws in workspaces.data"
          :key="ws.name"
          class="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface-gray-2"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-gray-2 text-xl"
          >
            <span v-if="ws.icon">{{ ws.icon }}</span>
            <FolderKanban v-else class="h-5 w-5 text-ink-gray-6" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-base font-medium text-ink-gray-9">
                {{ ws.workspace_name }}
              </span>
              <Badge
                v-if="ws.external_source"
                variant="subtle"
                :label="`from ${ws.external_source}`"
                theme="gray"
              />
            </div>
            <div class="mt-1 flex items-center gap-2 text-sm text-ink-gray-5">
              <code class="rounded bg-surface-gray-2 px-1.5 py-0.5">{{
                ws.slug
              }}</code>
              <span v-if="ws.description" class="truncate">
                · {{ ws.description }}
              </span>
            </div>
          </div>
          <div class="flex-shrink-0 text-sm text-ink-gray-5">
            {{ formatDate(ws.modified) }}
          </div>
        </li>
      </ul>
    </div>

    <CreateWorkspaceDialog v-model="showCreate" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Badge, Button } from 'frappe-ui'
import Plus from '~icons/lucide/plus'
import FolderKanban from '~icons/lucide/folder-kanban'
import CreateWorkspaceDialog from '@/components/CreateWorkspaceDialog.vue'
import { useWorkspacesStore } from '@/stores/workspaces'

const { workspaces } = useWorkspacesStore()
const showCreate = ref(false)

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
