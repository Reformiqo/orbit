<template>
  <div class="flex h-full w-full flex-col">
    <header
      class="flex items-center justify-between border-b border-outline-gray-1 px-6 py-3"
    >
      <div class="flex items-center gap-2">
        <InboxIcon class="h-5 w-5 text-ink-gray-7" />
        <h1 class="text-lg font-medium text-ink-gray-9">Inbox</h1>
        <span
          v-if="unreadCount > 0"
          class="rounded-full bg-surface-blue-1 px-2 py-0.5 text-xs font-medium text-ink-blue-3"
          data-testid="inbox-unread-count"
        >
          {{ unreadCount }} unread
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="unreadCount > 0"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-outline-gray-2 px-3 text-sm text-ink-gray-7 transition-colors hover:bg-surface-gray-2"
          data-testid="inbox-mark-all-read"
          @click="markAllRead"
        >
          <CheckCheck class="h-4 w-4" />
          Mark all read
        </button>
        <button
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-outline-gray-2 px-3 text-sm text-ink-gray-7 transition-colors hover:bg-surface-gray-2"
          :disabled="loading"
          data-testid="inbox-refresh"
          @click="reloadAll"
        >
          <RefreshCcw class="h-4 w-4" />
          Refresh
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div
        v-if="loading && !notifications.data && !todos.data"
        class="flex h-full items-center justify-center text-sm text-ink-gray-5"
      >
        Loading inbox…
      </div>

      <div
        v-else-if="!hasAnything"
        class="flex h-full items-center justify-center"
        data-testid="inbox-zero"
      >
        <div class="max-w-md text-center">
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-gray-2"
          >
            <InboxIcon class="h-7 w-7 text-ink-gray-6" />
          </div>
          <h2 class="mt-4 text-lg font-medium text-ink-gray-9">Inbox Zero</h2>
          <p class="mt-2 text-sm text-ink-gray-6">
            Nothing needs your attention right now. Mentions, comments,
            assignments, and updates will land here.
          </p>
        </div>
      </div>

      <div v-else class="w-full px-10 py-8">
        <!-- Notifications -->
        <section
          v-for="bucket in notificationBuckets"
          v-show="bucket.items.length"
          :key="bucket.key"
          class="mb-6"
          :data-testid="`inbox-bucket-${bucket.key}`"
        >
          <header class="mb-2 flex items-center gap-2">
            <h2 class="text-sm font-medium text-ink-gray-9">
              {{ bucket.label }}
            </h2>
            <span
              class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
            >
              {{ bucket.items.length }}
            </span>
          </header>
          <ul
            class="divide-y divide-outline-gray-1 rounded-md border border-outline-gray-1 bg-surface-white"
          >
            <li
              v-for="n in bucket.items"
              :key="n.name"
              class="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-gray-2"
              :class="!n.read ? 'bg-surface-blue-1/30' : ''"
              data-testid="inbox-notification"
              @click="openNotification(n)"
            >
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                :class="iconBg(n)"
              >
                <component
                  :is="iconForNotification(n)"
                  class="h-4 w-4"
                  :class="iconColor(n)"
                />
              </span>
              <div class="min-w-0 flex-1">
                <div
                  class="text-base text-ink-gray-9"
                  :class="!n.read ? 'font-medium' : ''"
                  v-html="n.subject"
                />
                <p class="mt-0.5 text-xs text-ink-gray-5">
                  {{ n.type || 'Alert' }} · {{ timeAgo(n.creation) }}
                </p>
              </div>
              <span
                v-if="!n.read"
                class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-ink-blue-3"
                aria-label="unread"
              />
            </li>
          </ul>
        </section>

        <!-- Assignments (ToDo) -->
        <section
          v-if="openTodos.length"
          class="mb-6"
          data-testid="inbox-open-section"
        >
          <header class="mb-2 flex items-center gap-2">
            <h2 class="text-sm font-medium text-ink-gray-9">Assignments</h2>
            <span
              class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
            >
              {{ openTodos.length }}
            </span>
          </header>
          <ul
            class="divide-y divide-outline-gray-1 rounded-md border border-outline-gray-1 bg-surface-white"
          >
            <li
              v-for="item in openTodos"
              :key="item.name"
              class="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-gray-2"
              data-testid="inbox-item"
              @click="openTodo(item)"
            >
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
              >
                <component
                  :is="iconForTodo(item)"
                  class="h-4 w-4 text-ink-gray-6"
                />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-base text-ink-gray-9">
                    {{ displayTitle(item) }}
                  </span>
                  <Badge
                    v-if="item.priority && item.priority !== 'Medium'"
                    :label="item.priority"
                    :theme="priorityTheme(item.priority)"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <p
                  v-if="item.reference_type"
                  class="mt-0.5 text-xs text-ink-gray-5"
                >
                  {{ item.reference_type }}
                  <span v-if="item.reference_name">
                    · {{ item.reference_name }}
                  </span>
                  <span v-if="item.date">
                    · due {{ formatDate(item.date) }}</span
                  >
                </p>
              </div>
              <ChevronRight
                class="mt-1.5 h-4 w-4 flex-shrink-0 text-ink-gray-5"
              />
            </li>
          </ul>
        </section>

        <!-- Closed assignments -->
        <section
          v-if="closedTodos.length"
          class="mb-6"
          data-testid="inbox-closed-section"
        >
          <header class="mb-2 flex items-center gap-2">
            <h2 class="text-sm font-medium text-ink-gray-9">Closed</h2>
            <span
              class="rounded-full bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
            >
              {{ closedTodos.length }}
            </span>
          </header>
          <ul
            class="divide-y divide-outline-gray-1 rounded-md border border-outline-gray-1 bg-surface-white"
          >
            <li
              v-for="item in closedTodos"
              :key="item.name"
              class="flex cursor-pointer items-start gap-3 px-4 py-3 text-ink-gray-6 transition-colors hover:bg-surface-gray-2"
              @click="openTodo(item)"
            >
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-2"
              >
                <Check class="h-4 w-4 text-ink-gray-5" />
              </span>
              <div class="min-w-0 flex-1">
                <span class="truncate text-base line-through">
                  {{ displayTitle(item) }}
                </span>
                <p
                  v-if="item.reference_type"
                  class="mt-0.5 text-xs text-ink-gray-5"
                >
                  {{ item.reference_type }}
                  <span v-if="item.reference_name">
                    · {{ item.reference_name }}
                  </span>
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Badge, createListResource, createResource, call } from 'frappe-ui'
import { socket } from '@/socket'
import InboxIcon from '~icons/lucide/inbox'
import RefreshCcw from '~icons/lucide/refresh-ccw'
import ChevronRight from '~icons/lucide/chevron-right'
import Check from '~icons/lucide/check'
import CheckCheck from '~icons/lucide/check-check'
import CheckSquare from '~icons/lucide/check-square'
import FileText from '~icons/lucide/file-text'
import Bell from '~icons/lucide/bell'
import AtSign from '~icons/lucide/at-sign'
import MessageSquare from '~icons/lucide/message-square'
import UserPlus from '~icons/lucide/user-plus'
import Activity from '~icons/lucide/activity'
import { useSessionStore } from '@/stores/session'
import { useInboxBadge } from '@/stores/inboxBadge'

const router = useRouter()
const session = useSessionStore()
const inboxBadge = useInboxBadge()

// Notifications (Notification Log) — fetched via our whitelisted endpoint so
// we can include sensible filters (current user) and ordering server-side.
const notifications = createResource({
  url: 'orbit.notifications.list_inbox',
  params: { limit: 100 },
  cache: 'orbit-inbox-notifications',
  auto: true,
})

const todos = createListResource({
  doctype: 'ToDo',
  fields: [
    'name',
    'status',
    'description',
    'reference_type',
    'reference_name',
    'allocated_to',
    'date',
    'priority',
    'modified',
  ],
  filters: { allocated_to: session.user || 'Administrator' },
  orderBy: 'modified desc',
  pageLength: 200,
  auto: false,
  cache: 'orbit-inbox-todos',
})

watch(
  () => session.user,
  (user) => {
    if (!user) return
    todos.update({ filters: { allocated_to: user } })
    todos.reload()
  },
  { immediate: true },
)

const loading = computed(() => notifications.loading || todos.loading)

const openTodos = computed(() =>
  (todos.data || []).filter((t) => t.status === 'Open'),
)
const closedTodos = computed(() =>
  (todos.data || []).filter((t) => t.status !== 'Open').slice(0, 20),
)

const items = computed(() => notifications.data || [])
const unreadCount = computed(() => items.value.filter((n) => !n.read).length)

const hasAnything = computed(
  () =>
    items.value.length > 0 ||
    openTodos.value.length > 0 ||
    closedTodos.value.length > 0,
)

const notificationBuckets = computed(() => {
  const today = []
  const week = []
  const earlier = []
  const now = Date.now()
  const oneDay = 86400000
  for (const n of items.value) {
    const created = new Date(
      String(n.creation || '').replace(' ', 'T'),
    ).getTime()
    const age = now - created
    if (age < oneDay) today.push(n)
    else if (age < 7 * oneDay) week.push(n)
    else earlier.push(n)
  }
  return [
    { key: 'today', label: 'Today', items: today },
    { key: 'week', label: 'This week', items: week },
    { key: 'earlier', label: 'Earlier', items: earlier },
  ]
})

function reloadAll() {
  notifications.reload()
  todos.reload()
  inboxBadge.refresh()
}

function displayTitle(item) {
  if (item.description) {
    return item.description.replace(/<[^>]*>/g, '').trim() || item.name
  }
  if (item.reference_type && item.reference_name) {
    return `${item.reference_type} · ${item.reference_name}`
  }
  return item.name
}

function iconForTodo(item) {
  if (item.reference_type === 'Task') return CheckSquare
  if (item.reference_type === 'Orbit Page') return FileText
  return Bell
}

function iconForNotification(n) {
  if (n.type === 'Mention') return AtSign
  if (n.type === 'Assignment') return UserPlus
  const subj = n.subject || ''
  if (/commented/i.test(subj)) return MessageSquare
  if (/moved|priority|due date/i.test(subj)) return Activity
  return Bell
}

function iconBg(n) {
  if (n.type === 'Mention') return 'bg-surface-blue-1'
  if (n.type === 'Assignment') return 'bg-surface-amber-1'
  return 'bg-surface-gray-2'
}

function iconColor(n) {
  if (n.type === 'Mention') return 'text-ink-blue-3'
  if (n.type === 'Assignment') return 'text-ink-amber-3'
  return 'text-ink-gray-6'
}

function priorityTheme(p) {
  switch (p) {
    case 'Urgent':
    case 'High':
      return 'red'
    default:
      return 'gray'
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(String(iso).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const created = new Date(String(iso).replace(' ', 'T')).getTime()
  const diff = Date.now() - created
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

async function openNotification(n) {
  if (!n.read) {
    try {
      await call('orbit.notifications.mark_read', { name: n.name })
      n.read = 1
      inboxBadge.refresh()
    } catch {
      // non-fatal
    }
  }
  if (n.document_type === 'Task' && n.document_name) {
    await routeToTask(n.document_name)
  }
}

async function openTodo(item) {
  if (item.reference_type === 'Task' && item.reference_name) {
    await routeToTask(item.reference_name)
  }
}

async function routeToTask(taskId) {
  try {
    const res = await fetch(
      `/api/method/frappe.client.get_value?doctype=Task&filters=${encodeURIComponent(
        JSON.stringify({ name: taskId }),
      )}&fieldname=${encodeURIComponent(JSON.stringify(['project']))}`,
      { credentials: 'include' },
    )
    const body = await res.json()
    const projectId = body?.message?.project
    if (projectId) {
      router.push({
        name: 'TaskDetail',
        params: { projectId, taskId },
      })
    }
  } catch {
    // ignore
  }
}

async function markAllRead() {
  try {
    await call('orbit.notifications.mark_read', { all: 1 })
    notifications.reload()
    inboxBadge.refresh()
  } catch {
    // ignore
  }
}

function onRealtimeNotification() {
  notifications.reload()
  inboxBadge.refresh()
}

onMounted(() => {
  socket?.on?.('orbit:notification', onRealtimeNotification)
})
onBeforeUnmount(() => {
  socket?.off?.('orbit:notification', onRealtimeNotification)
})
</script>
