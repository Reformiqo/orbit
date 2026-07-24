# TipTap setup

Orbit's rich-text editor lives at `frontend/src/components/editor/`. Decision: [ADR-0008](decisions.md).

## Component layout

```
frontend/src/components/editor/
  RichEditor.vue      # shared component, :profile prop
  ToolbarButton.vue   # small toolbar button
  profiles.js         # maps profile name → extension list
```

`RichEditor.vue` is used directly (not the `frappe-ui` `TextEditor`) so we can own the exact extension set, storage format, and styling tokens. `frappe-ui` does bundle a `TextEditor` with a broader extension set (emoji, image-group, slash commands, Typography, TextAlign, custom Heading) — useful later if we want Notion-style blocks, but the page profile deliberately stays minimal to ship now.

## Profiles

`profiles.js` exports `extensionsFor(profile, { placeholder })`. Three profiles, all MIT:

| Profile | Extensions |
|---|---|
| `comment` | StarterKit + Placeholder + Link (stub — same as starter for now) |
| `issue-description` | Same as `comment` (stub) |
| `page` | StarterKit + Placeholder + Link + TaskList + TaskItem + Table (+row/header/cell) + Image + CodeBlockLowlight |

Only `page` is actually wired up today. `comment` and `issue-description` are stubs so callers of `<RichEditor profile="comment">` compile; the other surface teams can fill them out without changing the component signature.

Why custom vs. `frappe-ui/TextEditor`:
- We want HTML output (not JSON) — see ADR-0008 and the storage note below.
- We want to control the exact tokens/classes in the toolbar and editor body.
- We want to stay on MIT core — `frappe-ui`'s editor pulls in a broader set, but none of it is `@tiptap-pro/*`, so if we swap to `frappe-ui` later we don't compromise the license rule.

## Package.json deps

All listed explicitly in `frontend/package.json` under `dependencies`:

```
@tiptap/core
@tiptap/pm
@tiptap/starter-kit
@tiptap/vue-3
@tiptap/extension-link
@tiptap/extension-placeholder
@tiptap/extension-task-list
@tiptap/extension-task-item
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-header
@tiptap/extension-table-cell
@tiptap/extension-image
@tiptap/extension-code-block-lowlight
lowlight
```

They were already installed transitively through `frappe-ui`, but we list them explicitly so:
- Imports like `import StarterKit from '@tiptap/starter-kit'` don't rely on hoist ordering.
- The feature's dep surface is documented in `package.json`.
- Bumping `frappe-ui` can't silently take a dependency away.

**Never pull `@tiptap-pro/*`** (ADR-0008). If we need real-time collab later, it's a separate decision.

## Storage

- HTML stored in the `content` Long Text field on `Orbit Page` (and later on Task description / Comment). We call `editor.getHTML()` in the `onUpdate` handler and pass it up via `v-model`.
- Keep it HTML — don't switch to JSON. Rationale: `LIKE` search works, Frappe's existing sanitization works, comments/pages can be concatenated.
- Sanitization: Frappe auto-sanitizes on save for `Long Text` via its `sanitize_html` hook chain. We do not run a second `bleach` pass yet — add one when we accept external imports.

## Router note (pages tail)

The existing project-detail route was `/projects/:projectId/:tab?`. To support `/projects/:projectId/pages/:pageId`, the route pattern was extended to `/projects/:projectId/:tab?/:pageId?`. The extra segment is optional so `.../tasks`, `.../overview`, etc. keep resolving. This is how `ProjectPagesTab` reads the selected page (`route.params.pageId`). When other tabs add their own detail IDs, the same tail slot works (today only `pages` uses it).

## Patterns adapted from Frappe CRM / frappe-ui

- Toolbar button visual pattern (rounded-sm, active state uses `bg-surface-gray-3 text-ink-gray-9`, hover `bg-surface-gray-2`) mirrors `TextEditorFixedMenu.vue` from `frappe-ui`.
- The `.ProseMirror` placeholder CSS (`p.is-editor-empty::before { content: attr(data-placeholder); }`) is copied verbatim from `frappe-ui/TextEditor.vue`.
- Task-list styling (`ul[data-type='taskList'] li { display: flex }`) — same pattern as `frappe-ui`.

## Auto-save

`ProjectPagesTab.vue` debounces saves to 1 second after the last keystroke. Strategy:

1. Edit → `onChange` fires → schedule a timer.
2. On blur of title input or route change (switching pages) → flush immediately.
3. `onBeforeUnmount` also flushes (tab close / navigation away).

The save uses `frappe.client.set_value` with a JSON `fieldname` object to patch `title` and `content` in one call. The list resource reloads on save so the tree reflects any title change.

## Testing

Playwright spec: `frontend/tests/pages.spec.ts`. Covers:
- Empty state render on a pages-less project
- Create + title persists (write to DB, read back via API)
- Editor receives input and stored HTML has `<p>…text…</p>` markup
- Nested child renders with greater `padding-left` than parent

Seeding is GET-callable and dev-mode guarded (see `orbit/tests/seed.py` — `seed_test_page`, `cleanup_test_pages`).
