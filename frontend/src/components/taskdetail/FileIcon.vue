<template>
  <component :is="icon" class="h-5 w-5 text-ink-gray-6" />
</template>

<script setup>
import { computed } from 'vue'
import FileIconGeneric from '~icons/lucide/file'
import FileText from '~icons/lucide/file-text'
import FileImage from '~icons/lucide/file-image'
import FileVideo from '~icons/lucide/file-video'
import FileAudio from '~icons/lucide/file-audio'
import FileArchive from '~icons/lucide/file-archive'
import FileSpreadsheet from '~icons/lucide/file-spreadsheet'
import FileCode from '~icons/lucide/file-code'

const props = defineProps({
  mime: { type: String, default: '' },
  filename: { type: String, default: '' },
})

const icon = computed(() => {
  const m = (props.mime || '').toLowerCase()
  const name = (props.filename || '').toLowerCase()
  if (m.startsWith('image/')) return FileImage
  if (m.startsWith('video/')) return FileVideo
  if (m.startsWith('audio/')) return FileAudio
  if (m.includes('zip') || m.includes('tar') || m.includes('compressed'))
    return FileArchive
  if (m.includes('sheet') || m.includes('csv') || name.endsWith('.csv'))
    return FileSpreadsheet
  if (
    m.includes('javascript') ||
    m.includes('json') ||
    m.includes('xml') ||
    /\.(js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|html|css|vue|json|yml|yaml)$/.test(
      name,
    )
  )
    return FileCode
  if (m.startsWith('text/') || m.includes('pdf') || name.endsWith('.pdf'))
    return FileText
  return FileIconGeneric
})
</script>
