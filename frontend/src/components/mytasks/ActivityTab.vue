<template>
  <div class="p-6">
    <h2 class="mb-4 text-lg font-medium text-ink-gray-9">Recent activity</h2>
    <p
      v-if="!recent.length"
      class="text-base text-ink-gray-5"
    >
      No recent activity yet. Task creates and updates you're involved in will
      show up here.
    </p>
    <ul v-else class="flex flex-col gap-5">
      <li
        v-for="t in recent"
        :key="t.name"
        class="flex items-start gap-3"
      >
        <span
          class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
        >
          <FileClock class="h-4 w-4 text-ink-gray-6" />
        </span>
        <div class="flex-1">
          <p class="text-base text-ink-gray-8">
            You updated
            <RouterLink
              :to="{
                name: 'ProjectDetail',
                params: { projectId: t.project, tab: 'tasks' },
              }"
              class="font-medium text-ink-gray-9 hover:underline"
            >
              {{ t.orbit_display_id || t.name }} {{ t.subject }}
            </RouterLink>
          </p>
          <p class="text-sm text-ink-gray-5">{{ timeAgo(t.modified) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import FileClock from '~icons/lucide/file-clock'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  states: { type: Array, default: () => [] },
})

const recent = computed(() =>
  [...props.tasks]
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 20),
)

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
