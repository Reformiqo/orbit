<template>
  <div class="flex flex-col">
    <!-- Cover banner -->
    <div
      class="h-24 flex-shrink-0 bg-gradient-to-br from-[#2490EF] via-[#6366F1] to-[#8B5CF6]"
    />
    <!-- Avatar overlaps -->
    <div class="-mt-8 flex items-end gap-3 px-4">
      <UserAvatar
        :email="email"
        :name="name"
        size="md"
        class="!h-16 !w-16 border-4 border-surface-menu-bar !text-base"
      />
    </div>
    <div class="px-4 pt-3">
      <h3 class="text-lg font-medium text-ink-gray-9">{{ name || email }}</h3>
      <p class="truncate text-sm text-ink-gray-5">{{ email }}</p>
    </div>

    <dl class="mt-4 px-4 text-sm">
      <div
        v-if="joined"
        class="flex items-center justify-between border-b border-outline-gray-1 py-2"
      >
        <dt class="text-ink-gray-6">Joined on</dt>
        <dd class="text-ink-gray-9">{{ joined }}</dd>
      </div>
      <div
        v-if="timezone"
        class="flex items-center justify-between border-b border-outline-gray-1 py-2"
      >
        <dt class="text-ink-gray-6">Timezone</dt>
        <dd class="text-ink-gray-9">{{ timezone }}</dd>
      </div>
    </dl>

    <!-- Project memberships -->
    <div v-if="projectStats.length" class="mt-4 px-4">
      <h4
        class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-gray-5"
      >
        Projects
      </h4>
      <div class="flex flex-col gap-1">
        <RouterLink
          v-for="p in projectStats"
          :key="p.name"
          :to="{
            name: 'ProjectDetail',
            params: { projectId: p.name, tab: 'tasks' },
          }"
          class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-gray-2"
        >
          <span class="flex items-center gap-2 truncate">
            <FolderClosed class="h-3.5 w-3.5 text-ink-gray-6" />
            <span class="truncate text-ink-gray-8">{{ p.project_name }}</span>
          </span>
          <span class="flex-shrink-0 text-xs text-ink-gray-5"
            >{{ p.progress }}%</span
          >
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import FolderClosed from '~icons/lucide/folder-closed'
import UserAvatar from '@/components/UserAvatar.vue'

defineProps({
  email: { type: String, default: '' },
  name: { type: String, default: '' },
  joined: { type: String, default: '' },
  timezone: { type: String, default: '' },
  projectStats: { type: Array, default: () => [] },
})
</script>
