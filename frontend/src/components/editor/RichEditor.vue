<template>
  <div class="orbit-rich-editor flex h-full w-full flex-col">
    <!-- Toolbar -->
    <div
      v-if="editor && showToolbar"
      class="flex flex-wrap items-center gap-0.5 border-b border-outline-gray-1 px-2 py-1"
      data-testid="rich-editor-toolbar"
    >
      <ToolbarButton
        :is-active="editor.isActive('bold')"
        title="Bold (Ctrl+B)"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        :is-active="editor.isActive('italic')"
        title="Italic (Ctrl+I)"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        :is-active="editor.isActive('heading', { level: 2 })"
        title="Heading"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        :is-active="editor.isActive('link')"
        title="Link"
        @click="promptLink"
      >
        <LinkIcon class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        v-if="profile === 'page'"
        :is-active="editor.isActive('codeBlock')"
        title="Code block"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <Code class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        v-if="profile === 'page'"
        title="Image"
        @click="promptImage"
      >
        <ImageIcon class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        v-if="profile === 'page'"
        title="Table"
        @click="
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        "
      >
        <TableIcon class="h-3.5 w-3.5" />
      </ToolbarButton>
      <span class="mx-1 h-4 w-px bg-outline-gray-2" />
      <ToolbarButton
        :is-active="editor.isActive('bulletList')"
        title="Bullet list"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <ListIcon class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        :is-active="editor.isActive('orderedList')"
        title="Ordered list"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        v-if="profile === 'page'"
        :is-active="editor.isActive('taskList')"
        title="Task list"
        @click="editor.chain().focus().toggleTaskList().run()"
      >
        <ListChecks class="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>

    <!-- Editor -->
    <EditorContent
      :editor="editor"
      class="orbit-rich-editor__content flex-1 overflow-auto px-5 py-4 text-sm text-ink-gray-9"
      data-testid="rich-editor-content"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { extensionsFor } from './profiles'
import Bold from '~icons/lucide/bold'
import Italic from '~icons/lucide/italic'
import Heading2 from '~icons/lucide/heading-2'
import LinkIcon from '~icons/lucide/link'
import Code from '~icons/lucide/code'
import ImageIcon from '~icons/lucide/image'
import TableIcon from '~icons/lucide/table'
import ListIcon from '~icons/lucide/list'
import ListOrdered from '~icons/lucide/list-ordered'
import ListChecks from '~icons/lucide/list-checks'
import ToolbarButton from './ToolbarButton.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  profile: {
    type: String,
    default: 'page',
    validator: (v) => ['comment', 'issue-description', 'page'].includes(v),
  },
  placeholder: { type: String, default: 'Start writing…' },
  editable: { type: Boolean, default: true },
  showToolbar: { type: Boolean, default: true },
  projectId: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus'])

const editor = ref(null)

function createEditor() {
  editor.value = new Editor({
    content: props.modelValue || '',
    editable: props.editable,
    extensions: extensionsFor(props.profile, {
      placeholder: props.placeholder,
      projectId: props.projectId,
    }),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none text-ink-gray-9 ' +
          'prose-headings:text-ink-gray-9 prose-strong:text-ink-gray-9 ' +
          'prose-code:text-ink-gray-9 prose-code:bg-surface-gray-2 ' +
          'prose-code:px-1 prose-code:rounded prose-code:text-xs ' +
          'prose-code:before:content-none prose-code:after:content-none ' +
          'prose-pre:bg-surface-gray-2 prose-pre:text-ink-gray-9 ' +
          'prose-table:table-fixed prose-td:p-2 prose-th:p-2 ' +
          'prose-td:border prose-th:border ' +
          'prose-td:border-outline-gray-2 prose-th:border-outline-gray-2',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      emit('update:modelValue', html)
      emit('change', html)
    },
    onBlur: ({ editor: ed, event }) => {
      emit('blur', { html: ed.getHTML(), event })
    },
    onFocus: ({ editor: ed, event }) => {
      emit('focus', { html: ed.getHTML(), event })
    },
  })
}

createEditor()

// Sync external content changes back into editor.
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if ((val || '') !== current) {
      editor.value.commands.setContent(val || '', false)
    }
  },
)

watch(
  () => props.editable,
  (val) => {
    if (editor.value) editor.value.setEditable(val)
  },
)

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
})

function promptLink() {
  const previous = editor.value.getAttributes('link').href || ''
  const url = window.prompt('URL', previous)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}

function promptImage() {
  const url = window.prompt('Image URL')
  if (!url) return
  editor.value.chain().focus().setImage({ src: url }).run()
}

function getHTML() {
  return editor.value ? editor.value.getHTML() : ''
}

function setHTML(html) {
  if (!editor.value) return
  editor.value.commands.setContent(html || '', false)
}

function focus() {
  editor.value?.commands?.focus()
}

defineExpose({ editor, getHTML, setHTML, focus })
</script>

<style>
.orbit-rich-editor__content .ProseMirror {
  min-height: 100%;
  outline: none;
  caret-color: var(--ink-gray-9);
  word-break: break-word;
}

.orbit-rich-editor__content
  .ProseMirror:not(.ProseMirror-focused)
  p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--ink-gray-4);
  pointer-events: none;
  float: left;
  height: 0;
}

.orbit-rich-editor__content .ProseMirror ul[data-type='taskList'] {
  list-style: none;
  padding-left: 0;
}

.orbit-rich-editor__content .ProseMirror ul[data-type='taskList'] li {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.25rem 0;
}

.orbit-rich-editor__content .ProseMirror ul[data-type='taskList'] li > label {
  flex: 0 0 auto;
  margin-top: 0.25rem;
}

.orbit-rich-editor__content .ProseMirror ul[data-type='taskList'] li > div > p {
  margin: 0;
}

.orbit-rich-editor__content .ProseMirror pre {
  overflow-x: auto;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
}
</style>
