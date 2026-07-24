<template>
  <div data-testid="history-tab">
    <ul
      v-if="entries.length"
      class="flex flex-col gap-5"
      data-testid="history-list"
    >
      <li
        v-for="entry in entries"
        :key="entry.key"
        class="flex items-start gap-3"
      >
        <UserAvatar :email="entry.owner" size="md" />
        <div class="min-w-0 flex-1 text-base text-ink-gray-8">
          <p class="flex items-center gap-2">
            <span class="font-medium">{{ userName(entry.owner) }}</span>
            <span class="text-ink-gray-6">{{ entry.verb }}</span>
            <span class="text-sm text-ink-gray-5">{{
              timeAgo(entry.creation)
            }}</span>
          </p>

          <div
            v-if="entry.type === 'comment'"
            class="mt-1 rounded-md border border-outline-gray-1 bg-surface-gray-1 px-3 py-2 text-base text-ink-gray-8"
            v-html="entry.content"
          />

          <ul
            v-else-if="entry.type === 'version' && entry.changes.length"
            class="mt-1 flex flex-col gap-1 text-sm text-ink-gray-6"
          >
            <li
              v-for="ch in visibleChanges(entry)"
              :key="ch.field"
              class="flex items-baseline gap-1"
            >
              <span class="font-medium text-ink-gray-8">{{
                humanize(ch.field)
              }}</span>
              <template v-if="canShowDiff(ch)">
                <span class="text-ink-gray-5">:</span>
                <span class="text-ink-gray-6">{{ fmt(ch.old) }}</span>
                <span class="text-ink-gray-5">→</span>
                <span class="text-ink-gray-8">{{ fmt(ch.new) }}</span>
              </template>
            </li>
            <li v-if="entry.changes.length > 3">
              <button
                class="text-sm text-ink-gray-6 underline hover:text-ink-gray-9"
                data-testid="history-show-more"
                @click="toggleExpand(entry.key)"
              >
                {{
                  expanded[entry.key]
                    ? 'Show less'
                    : `Show ${entry.changes.length - 3} more`
                }}
              </button>
            </li>
          </ul>
        </div>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="text-base text-ink-gray-5"
      data-testid="history-empty"
    >
      No history yet.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { frappeRequest } from 'frappe-ui'
import UserAvatar from '@/components/UserAvatar.vue'
import { useUsers } from '@/stores/users'

const props = defineProps({
  taskId: { type: String, required: true },
})

const users = useUsers()

const versions = ref([])
const comments = ref([])
const loading = ref(true)
const expanded = reactive({})

async function loadAll() {
  loading.value = true
  try {
    const [vRes, cRes] = await Promise.all([
      frappeRequest({
        url: '/api/method/frappe.client.get_list',
        params: {
          doctype: 'Version',
          filters: JSON.stringify([
            ['ref_doctype', '=', 'Task'],
            ['docname', '=', props.taskId],
          ]),
          fields: JSON.stringify(['name', 'owner', 'data', 'creation']),
          order_by: 'creation desc',
          limit_page_length: 200,
        },
      }),
      frappeRequest({
        url: '/api/method/frappe.client.get_list',
        params: {
          doctype: 'Comment',
          filters: JSON.stringify([
            ['reference_doctype', '=', 'Task'],
            ['reference_name', '=', props.taskId],
            ['comment_type', '=', 'Comment'],
          ]),
          fields: JSON.stringify([
            'name',
            'content',
            'comment_by',
            'owner',
            'creation',
          ]),
          order_by: 'creation desc',
          limit_page_length: 200,
        },
      }),
    ])
    versions.value = Array.isArray(vRes) ? vRes : vRes?.message || []
    comments.value = Array.isArray(cRes) ? cRes : cRes?.message || []
  } catch (err) {
    console.error('load history failed', err)
    versions.value = []
    comments.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
watch(() => props.taskId, loadAll)

defineExpose({ reload: loadAll })

const entries = computed(() => {
  const list = []

  for (const c of comments.value) {
    list.push({
      key: `c-${c.name}`,
      type: 'comment',
      creation: c.creation,
      owner: c.comment_by || c.owner,
      verb: 'commented',
      content: c.content,
    })
  }

  for (const v of versions.value) {
    let parsed
    try {
      parsed = typeof v.data === 'string' ? JSON.parse(v.data) : v.data
    } catch {
      parsed = {}
    }
    const raw = parsed?.changed || []
    const changes = raw.map(([field, oldVal, newVal]) => ({
      field,
      old: oldVal,
      new: newVal,
    }))
    if (!changes.length) continue
    const fieldNames = changes
      .slice(0, 3)
      .map((c) => humanize(c.field))
      .join(', ')
    const verb =
      changes.length > 3
        ? `changed ${fieldNames} +${changes.length - 3} more`
        : `changed ${fieldNames}`
    list.push({
      key: `v-${v.name}`,
      type: 'version',
      creation: v.creation,
      owner: v.owner,
      verb,
      changes,
    })
  }

  list.sort((a, b) => {
    const ta = new Date((a.creation || '').replace(' ', 'T')).getTime()
    const tb = new Date((b.creation || '').replace(' ', 'T')).getTime()
    return tb - ta
  })
  return list
})

function toggleExpand(key) {
  expanded[key] = !expanded[key]
}

function visibleChanges(entry) {
  if (expanded[entry.key]) return entry.changes
  return entry.changes.slice(0, 3)
}

function canShowDiff(ch) {
  return (
    isScalar(ch.old) &&
    isScalar(ch.new) &&
    (ch.old !== '' || ch.new !== '') &&
    !(ch.old == null && ch.new == null)
  )
}

function isScalar(v) {
  if (v == null) return true
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean'
}

function fmt(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'string' && v.length > 60) return v.slice(0, 57) + '…'
  return String(v)
}

function humanize(field) {
  if (!field) return ''
  return field
    .replace(/^orbit_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function userName(email) {
  if (!email) return ''
  const u = (users.data || []).find((x) => x.name === email)
  return u?.full_name || email
}

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
