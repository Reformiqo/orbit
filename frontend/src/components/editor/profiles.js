/**
 * Editor profile → TipTap extension list.
 *
 * Per ADR-0008 we keep MIT core only. Three profiles:
 *
 *   comment           — StarterKit minus heading/code-block, plus Link,
 *                       Placeholder, Mention (@ users). No slash menu.
 *   issue-description — comment base + TaskList + Image + CodeBlockLowlight +
 *                       SlashCommands (Heading 2/3, lists, code, image, quote, hr).
 *   page              — full wiki kit: StarterKit + Link + Placeholder + TaskList +
 *                       Table + Image + CodeBlockLowlight. Used by the Pages feature.
 *
 * The Pages feature wires `profile="page"` — do not change its extension
 * list without regression-testing `frontend/tests/pages.spec.ts`.
 */

import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { createLowlight, common } from 'lowlight'
import { buildMentionExtension } from './extensions/mentions'
import { buildSlashCommandsExtension } from './extensions/slashCommands'

const lowlight = createLowlight(common)

function baseExtensions({ placeholder, starterKitOverrides = {} } = {}) {
  return [
    StarterKit.configure({
      // We'll bring back a richer code block via CodeBlockLowlight where needed.
      codeBlock: false,
      ...starterKitOverrides,
    }),
    Placeholder.configure({
      placeholder: placeholder || 'Start writing…',
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        class: 'text-ink-blue-4 underline',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
  ]
}

export function extensionsFor(profile, opts = {}) {
  const { placeholder, projectId } = opts

  if (profile === 'comment') {
    // Strip headings + code-block from StarterKit; keep the rest.
    return [
      ...baseExtensions({
        placeholder,
        starterKitOverrides: { heading: false, codeBlock: false },
      }),
      buildMentionExtension(),
    ]
  }

  if (profile === 'issue-description') {
    return [
      ...baseExtensions({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      CodeBlockLowlight.configure({ lowlight }),
      buildMentionExtension(),
      buildSlashCommandsExtension({ projectId }),
    ]
  }

  if (profile === 'page') {
    return [
      ...baseExtensions({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      CodeBlockLowlight.configure({ lowlight }),
    ]
  }

  // Unknown profile — be safe.
  return baseExtensions({ placeholder })
}
