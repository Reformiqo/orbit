<template>
  <div data-testid="transitions-tab">
    <ul
      v-if="transitions.length"
      class="flex flex-col gap-5"
      data-testid="transitions-list"
    >
      <li
        v-for="entry in transitions"
        :key="entry.name"
        class="flex items-start gap-3"
      >
        <UserAvatar :email="entry.owner" size="md" />
        <div class="min-w-0 flex-1 text-base text-ink-gray-8">
          <p>
            <span class="font-medium">{{ userName(entry.owner) }}</span>
            moved from
            <span
              class="mx-0.5 inline-flex items-center gap-1 rounded border border-outline-gray-2 bg-surface-gray-1 px-1.5 py-0.5 text-sm text-ink-gray-8"
            >
              <span
                class="h-2 w-2 rounded-full"
                :style="{
                  backgroundColor: stateColor(entry.from) || '#94A3B8',
                }"
              />
              {{ stateName(entry.from) }}
            </span>
            to
            <span
              class="mx-0.5 inline-flex items-center gap-1 rounded border border-outline-gray-2 bg-surface-gray-1 px-1.5 py-0.5 text-sm text-ink-gray-8"
            >
              <span
                class="h-2 w-2 rounded-full"
                :style="{ backgroundColor: stateColor(entry.to) || '#94A3B8' }"
              />
              {{ stateName(entry.to) }}
            </span>
          </p>
          <p class="text-sm text-ink-gray-5">{{ timeAgo(entry.creation) }}</p>
        </div>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="text-base text-ink-gray-5"
      data-testid="transitions-empty"
    >
      No status changes yet.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { frappeRequest } from 'frappe-ui'
import UserAvatar from '@/components/UserAvatar.vue'
import { useUsers } from '@/stores/users'
import { useWorkflowStatesForProject } from '@/stores/workflowStates'

const props = defineProps({
  taskId: { type: String, required: true },
  projectId: { type: String, required: true },
})

const users = useUsers()
const states = useWorkflowStatesForProject(props.projectId)

const rawVersions = ref([])
const loading = ref(true)

async function loadVersions() {
  loading.value = true
  try {
    const res = await frappeRequest({
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
    })
    rawVersions.value = Array.isArray(res) ? res : res?.message || []
  } catch (err) {
    console.error('load transitions failed', err)
    rawVersions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadVersions)
watch(() => props.taskId, loadVersions)

defineExpose({ reload: loadVersions })

const transitions = computed(() => {
  const out = []
  for (const v of rawVersions.value) {
    let parsed
    try {
      parsed = typeof v.data === 'string' ? JSON.parse(v.data) : v.data
    } catch {
      continue
    }
    const changed = parsed?.changed || []
    for (const [field, oldVal, newVal] of changed) {
      if (field === 'orbit_workflow_state') {
        out.push({
          name: `${v.name}-${field}`,
          owner: v.owner,
          creation: v.creation,
          from: oldVal,
          to: newVal,
        })
      }
    }
  }
  return out
})

function stateName(id) {
  if (!id) return '—'
  const s = (states.data || []).find((x) => x.name === id)
  return s?.state_name || id
}
function stateColor(id) {
  if (!id) return ''
  const s = (states.data || []).find((x) => x.name === id)
  return s?.color || ''
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
