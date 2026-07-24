/**
 * `/` slash-command menu for the issue-description profile.
 *
 * Built on @tiptap/suggestion (the same plugin Mention uses). Each item is
 * `{ key, title, description, icon, command }`. `command(editor, range)`
 * handles the insertion — we always `deleteRange(range)` first so the `/`
 * and the query text are removed before inserting the new node.
 *
 * Image uploads go through Frappe's File upload endpoint
 * (`/api/method/upload_file`) so they end up on the site's File doctype
 * and can be referenced by URL in the saved HTML.
 */
import tippy from 'tippy.js'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import SlashCommandList from '../SlashCommandList.vue'
import Heading2 from '~icons/lucide/heading-2'
import Heading3 from '~icons/lucide/heading-3'
import ListIcon from '~icons/lucide/list'
import ListOrdered from '~icons/lucide/list-ordered'
import ListChecks from '~icons/lucide/list-checks'
import Code from '~icons/lucide/code'
import ImageIcon from '~icons/lucide/image'
import Quote from '~icons/lucide/quote'
import Minus from '~icons/lucide/minus'

async function uploadImage(file, { projectId } = {}) {
  const form = new FormData()
  form.append('file', file)
  form.append('is_private', '0')
  form.append('folder', 'Home')
  if (projectId) {
    form.append('doctype', 'Project')
    form.append('docname', projectId)
  }
  const csrf = window.csrf_token || ''
  const res = await fetch('/api/method/upload_file', {
    method: 'POST',
    headers: csrf ? { 'X-Frappe-CSRF-Token': csrf } : {},
    body: form,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`upload_file failed: HTTP ${res.status}`)
  const payload = await res.json()
  return payload?.message?.file_url || ''
}

function buildCommands({ projectId } = {}) {
  return [
    {
      key: 'heading-2',
      title: 'Heading 2',
      description: 'Big section heading',
      icon: Heading2,
      command: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run(),
    },
    {
      key: 'heading-3',
      title: 'Heading 3',
      description: 'Medium section heading',
      icon: Heading3,
      command: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run(),
    },
    {
      key: 'bullet-list',
      title: 'Bullet list',
      description: 'Simple bulleted list',
      icon: ListIcon,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      key: 'ordered-list',
      title: 'Numbered list',
      description: 'Ordered list',
      icon: ListOrdered,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      key: 'task-list',
      title: 'Task list',
      description: 'Checkbox list',
      icon: ListChecks,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      key: 'code-block',
      title: 'Code block',
      description: 'Fenced code snippet',
      icon: Code,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      key: 'image',
      title: 'Image',
      description: 'Upload from your device',
      icon: ImageIcon,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).run()
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            const url = await uploadImage(file, { projectId })
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          } catch (err) {
            console.error('orbit image upload failed', err)
          }
        }
        input.click()
      },
    },
    {
      key: 'blockquote',
      title: 'Blockquote',
      description: 'Highlighted quote',
      icon: Quote,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      key: 'horizontal-rule',
      title: 'Divider',
      description: 'Horizontal line',
      icon: Minus,
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ]
}

export function buildSlashCommandsExtension({ projectId } = {}) {
  const commands = buildCommands({ projectId })

  return Extension.create({
    name: 'orbitSlashCommands',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: false,
          allowSpaces: false,
          command: ({ editor, range, props }) => {
            props.command(editor, range)
          },
        },
      }
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          items: ({ query }) => {
            const q = (query || '').toLowerCase()
            if (!q) return commands
            return commands.filter(
              (c) =>
                c.title.toLowerCase().includes(q) ||
                c.key.toLowerCase().includes(q),
            )
          },
          render: () => {
            let component
            let popup

            return {
              onStart: (props) => {
                component = new VueRenderer(SlashCommandList, {
                  props,
                  editor: props.editor,
                })
                if (!props.clientRect) return
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },
              onUpdate(props) {
                component?.updateProps(props)
                if (!props.clientRect) return
                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect,
                })
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide()
                  return true
                }
                return component?.ref?.onKeyDown(props) || false
              },
              onExit() {
                popup?.[0]?.destroy()
                component?.destroy()
              },
            }
          },
        }),
      ]
    },
  })
}
