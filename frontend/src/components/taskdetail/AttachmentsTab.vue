<template>
  <div data-testid="attachments-tab">
    <!-- Upload zone -->
    <label
      class="relative flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-outline-gray-2 bg-surface-gray-1 px-6 py-8 text-center transition-colors cursor-pointer hover:bg-surface-gray-2"
      :class="{ 'border-ink-gray-7 bg-surface-gray-2': isDragging }"
      data-testid="attachments-dropzone"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <UploadCloud class="h-6 w-6 text-ink-gray-5" />
      <p class="text-base text-ink-gray-7">
        <span class="font-medium text-ink-gray-8">Drag a file here</span>
        or click to upload
      </p>
      <p v-if="uploading" class="text-sm text-ink-gray-5">Uploading…</p>
      <p v-else-if="uploadError" class="text-sm text-ink-red-5">
        {{ uploadError }}
      </p>
      <input
        ref="fileInputRef"
        type="file"
        class="sr-only"
        data-testid="attachments-file-input"
        @change="onPick"
      />
    </label>

    <!-- List -->
    <ul
      v-if="files.length"
      class="mt-6 divide-y divide-outline-gray-1 rounded-md border border-outline-gray-1 bg-surface-white"
      data-testid="attachments-list"
    >
      <li
        v-for="f in files"
        :key="f.name"
        class="flex items-center gap-4 px-4 py-3"
      >
        <span
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-surface-gray-2"
        >
          <FileIcon :mime="guessMime(f)" :filename="f.file_name" />
        </span>
        <div class="min-w-0 flex-1">
          <a
            :href="f.file_url"
            target="_blank"
            rel="noopener"
            class="block truncate text-base font-medium text-ink-gray-8 hover:text-ink-gray-9 hover:underline"
            :title="f.file_name"
          >
            {{ f.file_name }}
          </a>
          <div class="mt-1 flex items-center gap-2 text-sm text-ink-gray-5">
            <UserAvatar :email="f.owner" size="xs" />
            <span>{{ userName(f.owner) }}</span>
            <span>·</span>
            <span>{{ formatSize(f.file_size) }}</span>
            <span>·</span>
            <span>{{ timeAgo(f.creation) }}</span>
          </div>
        </div>
        <button
          v-if="canDelete(f)"
          class="flex h-8 w-8 items-center justify-center rounded-md text-ink-gray-5 hover:bg-surface-red-1 hover:text-ink-red-5"
          title="Delete attachment"
          data-testid="attachment-delete-btn"
          @click="confirmDelete(f)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <!-- Empty -->
    <p
      v-else-if="!loading"
      class="mt-6 text-base text-ink-gray-5"
      data-testid="attachments-empty"
    >
      No attachments yet — drag a file here or click to upload.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { frappeRequest } from 'frappe-ui'
import UploadCloud from '~icons/lucide/upload-cloud'
import Trash2 from '~icons/lucide/trash-2'
import UserAvatar from '@/components/UserAvatar.vue'
import FileIcon from './FileIcon.vue'
import { useUsers } from '@/stores/users'
import { useSessionStore } from '@/stores/session'

const props = defineProps({
  taskId: { type: String, required: true },
})

const users = useUsers()
const session = useSessionStore()

const files = ref([])
const loading = ref(true)
const uploading = ref(false)
const uploadError = ref('')
const isDragging = ref(false)
const fileInputRef = ref(null)

async function loadFiles() {
  loading.value = true
  try {
    const res = await frappeRequest({
      url: '/api/method/frappe.client.get_list',
      params: {
        doctype: 'File',
        filters: JSON.stringify([
          ['attached_to_doctype', '=', 'Task'],
          ['attached_to_name', '=', props.taskId],
        ]),
        fields: JSON.stringify([
          'name',
          'file_name',
          'file_url',
          'file_size',
          'is_private',
          'owner',
          'creation',
        ]),
        order_by: 'creation desc',
        limit_page_length: 200,
      },
    })
    files.value = Array.isArray(res) ? res : res?.message || []
  } catch (err) {
    console.error('load attachments failed', err)
    files.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadFiles)

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) upload(file)
  e.target.value = ''
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) upload(file)
}

async function upload(file) {
  uploading.value = true
  uploadError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('is_private', '0')
    formData.append('folder', 'Home')
    formData.append('doctype', 'Task')
    formData.append('docname', props.taskId)

    const headers = { Accept: 'application/json' }
    if (window.csrf_token && window.csrf_token !== '{{ csrf_token }}') {
      headers['X-Frappe-CSRF-Token'] = window.csrf_token
    }

    const resp = await fetch('/api/method/upload_file', {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    })
    if (!resp.ok) {
      let msg = `Upload failed (${resp.status})`
      try {
        const body = await resp.json()
        if (body?._server_messages) msg = body._server_messages
        else if (body?.exception) msg = body.exception
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    await loadFiles()
  } catch (err) {
    console.error('upload failed', err)
    uploadError.value = err?.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

function canDelete(f) {
  return f.owner === session.user
}

async function confirmDelete(f) {
  if (!confirm(`Delete "${f.file_name}"?`)) return
  try {
    await frappeRequest({
      url: '/api/method/frappe.client.delete',
      method: 'POST',
      params: { doctype: 'File', name: f.name },
    })
    await loadFiles()
  } catch (err) {
    console.error('delete attachment failed', err)
  }
}

function userName(email) {
  if (!email) return ''
  const u = (users.data || []).find((x) => x.name === email)
  return u?.full_name || email
}

function formatSize(bytes) {
  if (bytes == null || bytes === '') return ''
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function guessMime(f) {
  const name = (f.file_name || '').toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(name)) return 'image/*'
  if (/\.(mp4|mov|webm|mkv)$/.test(name)) return 'video/*'
  if (/\.(mp3|wav|ogg|flac|m4a)$/.test(name)) return 'audio/*'
  if (/\.(zip|tar|gz|rar|7z)$/.test(name)) return 'application/zip'
  if (/\.(csv|xls|xlsx)$/.test(name)) return 'text/csv'
  if (/\.(pdf|txt|md)$/.test(name)) return 'text/plain'
  return ''
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
