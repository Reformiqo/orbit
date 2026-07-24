# Rich Text Editor (TipTap)

Orbit uses [TipTap](https://tiptap.dev) for all rich text. Decision: [ADR-0008](decisions.md).

## Before building anything here

1. Read CRM's TipTap setup first — don't reinvent. `frappe-ui`'s `TextEditor`
   (`node_modules/frappe-ui/src/components/TextEditor/`) is the primary crib
   sheet — its `mention.js` + `MentionList.vue` are what we modeled the
   Orbit mention extension on.
2. Check what `frappe-ui` exports. For Orbit we deliberately build on the
   TipTap core directly (not `frappe-ui`'s `TextEditor`) so we can control
   which extensions each profile loads without dragging email-specific UI.

## Three usage profiles

One shared component (`frontend/src/components/editor/RichEditor.vue`),
profile prop controls which extensions load:

| Profile             | Used in                     | Extensions                                                                                              |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `comment`           | Task comments, inbox replies | StarterKit (no heading, no code block) + Link + Placeholder + **Mention (@ users)**                     |
| `issue-description` | Task detail description      | StarterKit + Link + Placeholder + TaskList + Image + CodeBlockLowlight + **Mention (@ users)** + **SlashCommands** (`/`) |
| `page`              | Project Pages (wiki)        | StarterKit + Link + Placeholder + TaskList + Table + Image + CodeBlockLowlight                           |

Slash commands are **not** enabled on `comment` — the composer stays lean and
avoids visual clutter in the comment stream. Mentions are enabled on both
`comment` and `issue-description`. Tables and the full slash menu live on
the richer `page` profile.

## File layout

```
frontend/src/components/editor/
  RichEditor.vue          # main component, accepts :profile :placeholder :project-id props
  profiles.js             # profile name → extension list (single source of truth)
  ToolbarButton.vue       # shared toolbar pill
  MentionList.vue         # suggestion popup UI for @ mentions
  SlashCommandList.vue    # suggestion popup UI for / commands
  extensions/
    mentions.js           # Mention config: tippy popup, @ trigger, users from store
    slashCommands.js      # Slash-command extension: tippy popup, / trigger, command registry
```

## Props on `<RichEditor>`

| Prop            | Type    | Default           | Notes                                                                 |
| --------------- | ------- | ----------------- | --------------------------------------------------------------------- |
| `modelValue`    | String  | `''`              | HTML string. `v-model` compatible.                                    |
| `profile`       | String  | `page`            | `comment` / `issue-description` / `page`.                             |
| `placeholder`   | String  | `Start writing…` | Shown when the editor is empty.                                       |
| `editable`      | Boolean | `true`            | Flip to render read-only.                                             |
| `showToolbar`   | Boolean | `true`            | Hide the formatting toolbar when embedding in small surfaces.         |
| `projectId`     | String  | `''`              | Scopes uploaded images to the project (Frappe File doctype metadata). |

Events: `update:modelValue`, `change`, `blur`, `focus`. Exposed methods:
`getHTML()`, `setHTML(html)`, `focus()`, plus the raw `editor` ref.

## Adding a new command to the slash menu

Open `extensions/slashCommands.js`, append to the `buildCommands()` array:

```js
{
  key: 'unique-key',
  title: 'Display name',
  description: 'One-line hint',
  icon: LucideIcon,
  command: (editor, range) =>
    editor.chain().focus().deleteRange(range)./* your ops */.run(),
}
```

The extension re-runs `buildCommands()` per-editor, so you can read
`projectId` or other config from the closure when needed.

## Mention sources

| Profile             | Mention sources | Trigger |
| ------------------- | --------------- | ------- |
| `comment`           | users           | `@`     |
| `issue-description` | users           | `@`     |
| `page`              | (none wired yet — add users + pages when the Pages v2 feature lands) | — |

Users come from `useUsers()` (`stores/users.js`) — cached list resource, 500
rows. We filter by substring match on `name` (email) and `full_name`, top 10.

Mentions persist as `<span data-type="mention" data-id="<email>"
data-label="<full name>">@Full Name</span>` in the saved HTML. Downstream
notification hooks can read `data-id` to discover mentioned users.

## Licensing

Stick to **TipTap MIT core**. Do not pull `@tiptap-pro/*` packages (AI,
collab cursors, unique-id). If we need real-time collaboration later, we
revisit — but socket.io + a simple last-write-wins on save is fine for v1.

Packages in use (all MIT):

- `@tiptap/core`, `@tiptap/vue-3`, `@tiptap/pm`, `@tiptap/starter-kit`
- `@tiptap/extension-link`, `@tiptap/extension-placeholder`
- `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
- `@tiptap/extension-image`, `@tiptap/extension-code-block-lowlight`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`,
  `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- `@tiptap/extension-mention`, `@tiptap/suggestion`
- `tippy.js` (MIT) for suggestion popup positioning
- `lowlight` for code highlight tokenization

## Storage

- Store editor content as HTML in `Long Text` fields (same as Frappe
  comments, ToDos).
- Do not store as JSON / ProseMirror doc — losing the ability to query
  with LIKE / full-text search hurts more than it helps.
- Sanitize on save (via Frappe's sanitization or a dedicated `bleach` pass)
  — TipTap itself doesn't strip unsafe HTML. Make sure the sanitizer's
  allow-list includes `<span data-type data-id data-label>` so mentions
  survive the round-trip.

## Testing

- Playwright spec per profile — see `frontend/tests/task-editor.spec.ts`
  for the task surface (comment + issue-description) and
  `frontend/tests/pages.spec.ts` for the `page` profile wired into the
  Pages feature.
- Assert the DOM has the expected node (`[data-type="mention"]`,
  `h2`, etc.) rather than inspecting raw HTML strings.
- Backend: on doctype save, verify HTML passes sanitization
  (no `<script>`, no `javascript:` hrefs).

## Follow-ups

- **Mention notifications** — currently the `<span data-type="mention">`
  persists but we don't notify the mentioned user. Next pass: hook into
  the Task `on_update` / Comment `after_insert` to scan for
  `data-type="mention"` spans, resolve `data-id` to users, and invoke
  `frappe.desk.form.assign_to.add` or `frappe.core.doctype.activity_log
  .feed.send` to wire up the notification.
- **Page-profile mentions** — wire users + cross-page references
  (`[[page name]]`) when the Pages feature is ready.
