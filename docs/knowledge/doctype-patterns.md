# Doctype Patterns

Reusable patterns discovered while building Orbit doctypes. Follow these when creating new ones.

## Directory / file naming

Frappe derives the folder name from the doctype name by lowercasing and replacing spaces with underscores:

- Doctype name: `Orbit Workspace`
- Directory: `orbit/orbit/orbit/doctype/orbit_workspace/`
- Files: `orbit_workspace.json`, `orbit_workspace.py`, `test_orbit_workspace.py`, `__init__.py`

**Prefix every doctype with `Orbit `** so they're namespaced inside a shared bench with other apps (avoids collisions with Frappe Project, ERPNext Project, etc.).

## Import-compatibility fields (every importable doctype)

Every doctype that can receive imported data (Workspace, Project, Issue, Cycle, View, etc.) must include these fields in an `import_section` collapsible Section Break:

```
external_id       Data        # e.g. "ABP2-I134" or Zoho's internal numeric ID
external_source   Select      # "\nzoho_projects\njira\nlinear\ncsv"
external_url      Data        # deep link back to source
imported_at       Datetime    # set automatically when external_id is present
```

In the controller:
```python
def before_insert(self):
    if self.external_id and not self.imported_at:
        self.imported_at = frappe.utils.now_datetime()
```

See [zoho-compatibility.md](zoho-compatibility.md) for the full rationale.

## Slug / identifier fields

When a doctype has a human-friendly slug that becomes the primary key (`autoname: field:slug`):

1. **Set `autoname: "field:slug"`** in the JSON
2. **Normalize in `before_validate`**, NOT `validate`:
   ```python
   def before_validate(self):
       if self.slug:
           self.slug = self.slug.strip().lower()
       if self.name and isinstance(self.name, str):
           self.name = self.name.strip().lower()
   ```
   Why: Frappe's `set_new_name` copies `self.slug` to `self.name` *before* `validate()` runs. If you normalize only in `validate`, the name can diverge from the slug. `before_validate` runs first.
3. **Validate in `validate`** with an explicit regex:
   ```python
   SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$|^[a-z0-9]$")

   def validate(self):
       if not self.slug or not SLUG_PATTERN.match(self.slug):
           frappe.throw("Slug must be 1–40 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen.")
   ```
4. **Mark `slug` as `unique: 1`** in the JSON.

## Testing pattern

Use `IntegrationTestCase` (not the deprecated `FrappeTestCase`):

```python
import frappe
from frappe.tests import IntegrationTestCase

class TestOrbitWorkspace(IntegrationTestCase):
    def setUp(self):
        frappe.db.delete("Orbit Workspace", {"slug": ["like", "test-%"]})

    def tearDown(self):
        frappe.db.delete("Orbit Workspace", {"slug": ["like", "test-%"]})

    def _make(self, **overrides):
        data = {"doctype": "Orbit Workspace", "workspace_name": "Test", "slug": "test-basic"}
        data.update(overrides)
        return frappe.get_doc(data).insert()
```

Rules:
- Use a `test-` slug prefix so setUp/tearDown can clean them deterministically
- Always clean in both setUp AND tearDown (setUp handles leftover state from failed runs)
- Wrap creation in a `_make` helper so tests stay short
- Assert specific fields, not whole docs — makes failure messages readable

## Running tests

```bash
# One module:
bench --site v16.erpera.io run-tests --app orbit --module orbit.orbit.doctype.orbit_workspace.test_orbit_workspace

# Whole app:
bench --site v16.erpera.io run-tests --app orbit
```

## Extending existing Frappe doctypes (Project pattern)

When extending a core Frappe/ERPNext doctype (not creating a new one), the pattern:

1. **Don't copy/fork the doctype** — add Custom Fields declaratively in `orbit/setup/custom_fields.py`:
   ```python
   from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

   PROJECT_CUSTOM_FIELDS = {
       "Project": [
           {"fieldname": "orbit_workspace", "fieldtype": "Link", ...},
           ...
       ],
   }

   def ensure_custom_fields():
       create_custom_fields(PROJECT_CUSTOM_FIELDS, update=True)
   ```
2. **Wire to `after_install` AND `after_migrate`** in `hooks.py` so the fields are idempotently created on install and every migration.
3. **Prefix every custom field with `orbit_`** — avoids collisions with other apps that customize the same doctype, and makes it clear in Desk which app owns which field.
4. **Validation in `doc_events`**, not in the doctype JSON — `hooks.py`:
   ```python
   doc_events = {"Project": {"validate": "orbit.overrides.project.validate"}}
   ```
5. **Controller lives at `orbit/overrides/<doctype>.py`** — not inside `orbit/orbit/doctype/` (that's only for net-new Orbit doctypes).
6. **Tests live at `orbit/overrides/test_<doctype>.py`** — use a distinctive `project_name` prefix (e.g. `Orbit Test Project ...`) for setUp/tearDown cleanup.
7. **After adding new custom fields**, gunicorn must reload for the doc_events hook to pick up. See the restart gotcha below.

## Seeding Playwright test data via GET-whitelisted methods

For Playwright specs that need to seed data BEFORE the UI flow runs (e.g. a pre-existing project for a detail-page test), don't POST to `frappe.client.insert` from the test — you'll fight CSRF. Instead, add a GET-callable whitelisted helper in `orbit/tests/seed.py`:

```python
@frappe.whitelist(allow_guest=False)
def seed_test_project(project_name: str, identifier: str, workspace: str = "default") -> str:
    if not frappe.conf.developer_mode:
        frappe.throw("Test seed is only available in developer mode.")
    # create and return
```

Rules:
- **GET is fine** — `@frappe.whitelist()` exposes via GET, avoiding CSRF
- **Always guard behind `frappe.conf.developer_mode`** — production must refuse
- **Use `ignore_permissions=True` on insert** — seed runs as the test user, which may not have write perms on the target doctype
- **Pair with a `cleanup_test_<doctype>` method** that deletes by prefix — use this in `beforeEach`/`afterEach`

## Permissions note: test user must have role of the doctype you're writing

Adding System Manager does NOT automatically grant access to app-specific doctypes like Project (ERPNext). When tests start failing with "User X does not have doctype access via role permission for document Y", add the required role to `ORBIT_TESTER_ROLES` in `orbit/tests/seed.py` and re-run `create_test_user`. Current roles: System Manager, Projects User, Projects Manager.

## Migrate gotcha on this bench

`bench --site v16.erpera.io migrate` currently fails in a `post_schema_updates` hook from the `orange_fsm` app (missing `tabHD Ticket` table — pre-existing, unrelated to Orbit). The schema sync itself completes before the failing hook, so new Orbit doctypes still get their tables created. Verify with:

```bash
bench --site v16.erpera.io mariadb -e "SHOW TABLES LIKE 'tabOrbit%'"
```

After creating a new doctype, `bench --site v16.erpera.io migrate --skip-failing` is usually enough.
