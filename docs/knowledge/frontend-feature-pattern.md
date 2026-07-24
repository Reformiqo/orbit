# Full-stack Feature Pattern

How to add a new full-stack feature in Orbit. The Workspace feature is the canonical example.

## Layers

1. **Doctype** — `orbit/orbit/doctype/<name>/` (JSON + controller + test) — see [doctype-patterns.md](doctype-patterns.md).
2. **Pinia store** — `frontend/src/stores/<name>.js` — wraps `createListResource` from `frappe-ui`.
3. **Page component** — `frontend/src/pages/<Name>.vue` — header (breadcrumb + Create button), filter/toolbar, list/empty state.
4. **Create dialog** — `frontend/src/components/Create<Name>Dialog.vue` — emits `created`, reloads store.
5. **Route** — entry in `frontend/src/router.js`.
6. **Sidebar** — entry in `frontend/src/components/Layouts/AppSidebar.vue` (until moved to the right place).
7. **Playwright spec** — `frontend/tests/<name>.spec.ts` — empty state, create flow, validation errors.

## Data access — createListResource

```js
import { defineStore } from 'pinia'
import { createListResource } from 'frappe-ui'

export const useWorkspacesStore = defineStore('workspaces', () => {
  const workspaces = createListResource({
    doctype: 'Orbit Workspace',
    fields: ['name', 'workspace_name', 'slug', 'icon', 'modified'],
    orderBy: 'modified desc',
    pageLength: 100,
    auto: true,              // fetches on creation
    cache: 'orbit-workspaces', // dedupe across components
  })
  return { workspaces }
})
```

Components access reactive data via `workspaces.data`, loading state via `workspaces.loading`, reload via `workspaces.reload()`.

## Create dialog — createResource

```js
const created = await createResource({
  url: 'frappe.client.insert',
  params: {
    doc: {
      doctype: 'Orbit Workspace',
      workspace_name: form.workspace_name,
      slug: form.slug,
    },
  },
}).submit()
workspaces.reload()
```

Catches server errors and surfaces them via `err.messages[0] || err.message`.

## Slug auto-derivation (form UX)

When a form has a human name and a URL slug, auto-derive the slug from the name until the user manually edits the slug. Once they touch it, stop overwriting.

```js
const slugTouched = ref(false)
watch(() => form.slug, (_, old) => { if (old) slugTouched.value = true })
function onNameInput(e) {
  if (!slugTouched.value) form.slug = slugify(e.target.value)
}
```

## Empty state

Centered icon + title + subtitle + inline CTA button. Copy matches the Frappe CRM list empty-state density.

```vue
<div v-if="!items.data?.length" class="flex h-full items-center justify-center">
  <div class="text-center">
    <FolderKanban class="mx-auto h-8 w-8 text-ink-gray-5" />
    <h2 class="mt-3 text-lg font-medium text-ink-gray-9">No items yet</h2>
    <p class="mt-1 text-sm text-ink-gray-5">...</p>
    <Button class="mt-4 !bg-ink-gray-9 !text-white">Create</Button>
  </div>
</div>
```

## Page header

Matches the CRM layout — left: breadcrumb + title, right: dark pill Create button.

```vue
<header class="flex items-center justify-between border-b border-outline-gray-1 px-5 py-3">
  <div class="flex items-center gap-2">
    <h1 class="text-base font-medium text-ink-gray-9">Workspaces</h1>
    <span class="text-base text-ink-gray-5">/</span>
    <span class="text-sm text-ink-gray-6">All</span>
  </div>
  <Button variant="solid" class="!bg-ink-gray-9 !text-white hover:!bg-ink-gray-8" @click="showCreate = true">
    <template #prefix><Plus class="h-4 w-4" /></template>
    Create
  </Button>
</header>
```

## Testing pattern — Playwright + whitelisted cleanup

For any feature that writes to a doctype, add a test-only cleanup method to `orbit/tests/seed.py`:

```python
@frappe.whitelist(allow_guest=False)
def cleanup_test_workspaces(prefix: str = "pw-") -> int:
    if not frappe.conf.developer_mode:
        frappe.throw("Test cleanup is only available in developer mode.")
    if not prefix or len(prefix) < 2:
        frappe.throw("Refusing to clean with a too-short prefix.")
    # delete & return count
```

Rules:
- **Developer-mode guard** — the method refuses to run in production
- **Prefix guard** — require a non-trivial prefix (`pw-` for Playwright, `test-` for unit tests) so a stray call can't wipe real data
- **Expose as GET** — callable via `/api/method/orbit.tests.seed.cleanup_...?prefix=pw-`. GET avoids CSRF friction with Playwright's `request` fixture
- **Use a distinctive slug prefix** in tests so the cleanup is surgical — `pw-acme-inc`, `pw-bad-slug`, etc.

Call from the spec:
```ts
await request.get(`${baseURL}/api/method/orbit.tests.seed.cleanup_test_workspaces?prefix=pw-`)
```

### Selector guidance

When the same text appears in multiple places (sidebar nav button + page header + dialog heading + submit button), use role-based selectors:

- `getByRole('heading', { name: 'Create workspace' })` — for the dialog title
- `getByRole('button', { name: 'Create workspace' })` — for the submit button
- `getByRole('alert')` — for form error messages
- `getByTestId('...')` — for deterministic targets (header Create button, list container)
- `getByLabel('Workspace name')` — for form inputs

Never rely on `getByText(...)` when ambiguity is possible.

## CRITICAL: website_route_rules requires cache flush + gunicorn restart

After adding or changing `website_route_rules` in `hooks.py`:

1. **`bench --site <site> migrate`** (or clear the `website_route_rules` Redis cache key — see below)
2. **Restart the gunicorn master** — `bench start`'s gunicorn uses `--preload`, which loads hooks once at boot. Workers do NOT pick up hooks.py edits until the master restarts.
   - Under supervisor: `sudo supervisorctl restart v16-frappe-web` (needs sudo)
   - Or kill the gunicorn master PID — supervisor's `autorestart=true` brings it back
3. **Manual cache flush** (if migrate doesn't run due to an unrelated migration failure):
   ```bash
   bench --site <site> execute 'frappe.cache.delete_value("website_route_rules")'
   ```

Symptom when this isn't done: `/orbit` (root) returns 200 but `/orbit/anything` returns 404, even though `frappe.get_hooks("website_route_rules")` includes the rule. The stale `website_route_rules` Redis cache holds a rules list that doesn't include yours.
