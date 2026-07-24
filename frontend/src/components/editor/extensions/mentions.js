/**
 * @ mentions — configured against Orbit's user store.
 *
 * Crib sheet from frappe-ui's TextEditor/mention.js. We keep the TipTap
 * Mention node output (HTML attrs) so the stored HTML carries
 * `<span data-type="mention" data-id="<email>">@Full Name</span>`.
 *
 * Suggestion list UI lives in MentionList.vue; positioned with tippy.js.
 */
import tippy from 'tippy.js'
import { VueRenderer } from '@tiptap/vue-3'
import Mention from '@tiptap/extension-mention'
import MentionList from '../MentionList.vue'
import { useUsers } from '@/stores/users'

function normalise(str) {
  return (str || '').toString().toLowerCase()
}

function getUserItems(query) {
  const users = useUsers()
  const pool = users.data || []
  const q = normalise(query).trim()
  const scored = pool
    .filter((u) => u.enabled !== 0)
    .map((u) => ({
      id: u.name,
      label: u.full_name || u.name,
      image: u.user_image || '',
      match:
        normalise(u.name).includes(q) ||
        normalise(u.full_name).includes(q),
    }))
  const matched = q ? scored.filter((u) => u.match) : scored
  return matched.slice(0, 10)
}

export function buildMentionExtension() {
  return Mention.configure({
    HTMLAttributes: {
      class: 'orbit-mention rounded-md bg-surface-blue-1 px-1 py-0.5 text-ink-blue-3 font-medium',
    },
    renderHTML({ options, node }) {
      // Persist as a plain anchor-like span so Frappe's sanitizer keeps it.
      // data-id carries the user email for downstream notification hooks.
      const id = node.attrs.id || ''
      const label = node.attrs.label || id
      return [
        'span',
        {
          class: 'orbit-mention rounded-md bg-surface-blue-1 px-1 py-0.5 text-ink-blue-3 font-medium',
          'data-type': 'mention',
          'data-id': id,
          'data-label': label,
        },
        `@${label}`,
      ]
    },
    suggestion: {
      char: '@',
      items: ({ query }) => getUserItems(query),
      render: () => {
        let component
        let popup

        return {
          onStart: (props) => {
            component = new VueRenderer(MentionList, {
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
    },
  })
}
