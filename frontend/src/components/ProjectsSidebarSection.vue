<template>
  <div v-show="!isCollapsed" class="mx-2 my-2" />

  <div
    v-show="!isCollapsed"
    class="group flex items-center justify-between px-4 pt-3 pb-2"
  >
    <span class="text-base font-medium text-ink-gray-5">Projects</span>
    <button
      class="flex h-6 w-6 items-center justify-center rounded text-ink-gray-6 transition-colors hover:bg-surface-gray-3 hover:text-ink-gray-9"
      title="Create project"
      data-testid="sidebar-create-project"
      @click="$emit('create')"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>

  <div v-show="!isCollapsed" class="px-2">
    <p
      v-if="!projects.length"
      class="px-2 py-1.5 text-sm italic text-ink-gray-5"
    >
      No projects yet
    </p>
    <Tree
      v-else
      v-for="rootNode in treeNodes"
      :key="rootNode.id"
      :node="rootNode"
      node-key="id"
      :options="treeOptions"
    >
      <template #node="{ node, hasChildren, isCollapsed: isNodeCollapsed, toggleCollapsed }">
        <div
          class="group flex h-9 items-center gap-1 rounded pl-1 pr-2 transition-colors"
          :class="
            isNodeActive(node)
              ? 'bg-surface-selected shadow-sm'
              : 'hover:bg-surface-gray-2'
          "
          data-testid="sidebar-project-row"
        >
          <button
            v-if="hasChildren"
            class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-ink-gray-6 hover:bg-surface-gray-3"
            :aria-label="`${isNodeCollapsed ? 'Expand' : 'Collapse'} ${node.label}`"
            @click="toggleCollapsed"
          >
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="{ '-rotate-90': isNodeCollapsed }"
            />
          </button>
          <span v-else class="h-6 w-6 flex-shrink-0" />
          <component
            :is="node.icon"
            v-if="node.icon"
            class="h-4 w-4 flex-shrink-0 text-ink-gray-7"
          />
          <button
            class="flex min-w-0 flex-1 items-center gap-2 text-left text-base text-ink-gray-8"
            @click="onNodeClick(node)"
          >
            <span class="truncate">{{ node.label }}</span>
            <code
              v-if="node.identifier"
              class="flex-shrink-0 text-[11px] text-ink-gray-5"
            >
              {{ node.identifier }}
            </code>
          </button>
        </div>
      </template>
    </Tree>
  </div>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tree } from 'frappe-ui'
import Plus from '~icons/lucide/plus'
import ChevronDown from '~icons/lucide/chevron-down'
import FolderClosed from '~icons/lucide/folder-closed'
import LayoutDashboard from '~icons/lucide/layout-dashboard'
import CheckSquare from '~icons/lucide/check-square'
import Package from '~icons/lucide/package'
import Target from '~icons/lucide/target'
import Eye from '~icons/lucide/eye'
import FileText from '~icons/lucide/file-text'
import Settings from '~icons/lucide/settings'

const props = defineProps({
  isCollapsed: { type: Boolean, default: false },
  projects: { type: Array, default: () => [] },
})
defineEmits(['create'])

const route = useRoute()
const router = useRouter()

const projectSubNav = [
  { key: 'overview', label: 'Overview', icon: markRaw(LayoutDashboard) },
  { key: 'tasks', label: 'Tasks', icon: markRaw(CheckSquare) },
  { key: 'modules', label: 'Modules', icon: markRaw(Package) },
  { key: 'milestones', label: 'Milestones', icon: markRaw(Target) },
  { key: 'views', label: 'Views', icon: markRaw(Eye) },
  { key: 'pages', label: 'Pages', icon: markRaw(FileText) },
  { key: 'settings', label: 'Settings', icon: markRaw(Settings) },
]

const treeOptions = {
  rowHeight: '36px',
  indentWidth: '14px',
  showIndentationGuides: false,
  defaultCollapsed: true,
}

const treeNodes = computed(() =>
  props.projects.map((p) => ({
    id: p.name,
    label: p.project_name || p.name,
    identifier: p.orbit_identifier,
    icon: markRaw(FolderClosed),
    projectId: p.name,
    tabKey: null,
    children: projectSubNav.map((sub) => ({
      id: `${p.name}:${sub.key}`,
      label: sub.label,
      icon: sub.icon,
      projectId: p.name,
      tabKey: sub.key,
      children: [],
    })),
  })),
)

function onNodeClick(node) {
  if (!node?.projectId) return
  const params = { projectId: node.projectId }
  if (node.tabKey) params.tab = node.tabKey
  router.push({ name: 'ProjectDetail', params })
}

function isNodeActive(node) {
  if (!node?.projectId) return false
  if (route.name !== 'ProjectDetail') return false
  if (route.params.projectId !== node.projectId) return false
  if (node.tabKey) {
    return (route.params.tab || 'overview') === node.tabKey
  }
  // Parent project row is active when no sub-tab matched
  return !route.params.tab || route.params.tab === 'overview'
}
</script>
