<template>
  <div class="flex h-full w-full flex-col">
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-6 py-4"
    >
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-medium text-ink-gray-9">Projects</h1>
        <span class="text-lg text-ink-gray-5">/</span>
        <span class="text-base text-ink-gray-6">All</span>
      </div>
      <Button
        variant="solid"
        class="!h-9 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
        data-testid="projects-create-btn"
        @click="showCreate = true"
      >
        <template #prefix><Plus class="h-4 w-4" /></template>
        Create
      </Button>
    </header>

    <div class="flex-1 overflow-auto">
      <div
        v-if="projects.loading && !projects.data"
        class="flex h-full items-center justify-center text-base text-ink-gray-5"
      >
        Loading projects…
      </div>

      <div
        v-else-if="!projects.data || projects.data.length === 0"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center">
          <FolderKanban class="mx-auto h-10 w-10 text-ink-gray-5" />
          <h2 class="mt-3 text-xl font-medium text-ink-gray-9">
            No projects yet
          </h2>
          <p class="mt-1.5 text-base text-ink-gray-5">
            Create your first project to start tracking tasks.
          </p>
          <Button
            variant="solid"
            class="mt-4 !h-9 !bg-ink-gray-9 !text-white hover:!bg-ink-gray-8"
            @click="showCreate = true"
          >
            <template #prefix><Plus class="h-4 w-4" /></template>
            Create project
          </Button>
        </div>
      </div>

      <ul v-else class="divide-y divide-outline-gray-1" data-testid="projects-list">
        <li
          v-for="p in projects.data"
          :key="p.name"
          class="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-surface-gray-2"
          @click="goTo(p.name)"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-gray-2"
          >
            <FolderClosed class="h-5 w-5 text-ink-gray-6" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-base font-medium text-ink-gray-9">
                {{ p.project_name || p.name }}
              </span>
              <code
                v-if="p.orbit_identifier"
                class="rounded bg-surface-gray-2 px-1.5 py-0.5 text-sm text-ink-gray-7"
              >
                {{ p.orbit_identifier }}
              </code>
              <Badge
                v-if="p.orbit_external_source"
                variant="subtle"
                :label="`from ${p.orbit_external_source}`"
                theme="gray"
              />
            </div>
            <div class="mt-1 flex items-center gap-2 text-sm text-ink-gray-5">
              <span v-if="p.status">{{ p.status }}</span>
            </div>
          </div>
          <div class="flex-shrink-0 text-sm text-ink-gray-5">
            {{ formatDate(p.modified) }}
          </div>
        </li>
      </ul>
    </div>

    <CreateProjectDialog v-model="showCreate" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Badge, Button } from 'frappe-ui'
import Plus from '~icons/lucide/plus'
import FolderKanban from '~icons/lucide/folder-kanban'
import FolderClosed from '~icons/lucide/folder-closed'
import CreateProjectDialog from '@/components/CreateProjectDialog.vue'
import { useProjectsStore } from '@/stores/projects'

const router = useRouter()
const { projects } = useProjectsStore()
const showCreate = ref(false)

function goTo(name) {
  router.push({ name: 'ProjectDetail', params: { projectId: name } })
}

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
