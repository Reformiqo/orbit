# Zoho Projects Import Compatibility

User's current PM tool is **Zoho Projects** (`projects.zoho.in/portal/reformiqobusiness`). Orbit must be designed so existing Zoho data can be imported with full fidelity.

## What the user has in Zoho today

Observed from screenshot of the `Query` view:

- **Projects** with identifier prefixes — `SEPPL (Detox Group)` → `ABP2`, `Adil Qadri` → `AQ1`
- **Queries** — client-reported items with IDs like `ABP2-I134`, `AQ1-I6`
- **Tasks** — internal work items (separate from Queries)
- **Milestones** — goal markers
- **Time Logs** — effort tracking
- **Reports** — aggregated analytics
- **Collaboration** — project-level discussions
- **Custom Views** — saved filters/queries
- **Statuses** — custom per project (e.g. `Under Client Testing`, `Customization`, `Open`, `In progress`, `Reopen`)
- **Reporter** (who raised it) vs **Assignee** (who works on it) — both first-class fields

## Orbit → Zoho concept mapping

| Zoho | Orbit | Notes |
|---|---|---|
| Project | Frappe Project + custom fields | Add `identifier` (prefix), `external_id`, `external_source` |
| Task | Frappe Task + `task_type = "Task"` | Default type |
| Query | Frappe Task + `task_type = "Query"` | Same doctype, first-class type — client-reported work (ADR-0011) |
| Bug / Story / Spike | Frappe Task + `task_type = "Bug"` etc. | Per-workspace configurable via Orbit Task Type |
| Milestone | Orbit Milestone doctype | Goal-based, optional target date (ADR-0010). NO Cycle doctype — Cycles are not shipped |
| Time Log | Frappe Timesheet | Reuse |
| Reporter | `reporter` field on Task | Separate from `_assign`/assignee |
| Custom View | Orbit View doctype | Saved filter config, scoped per project |
| Status (per project) | Orbit Workflow State doctype | Project-scoped, configurable, with colors |
| Collaboration | Frappe Comment + Activity | Reuse |
| Reports | Orbit Analytics page | Built later (workspace-level + per-project Overview tab) |

## Required fields for import fidelity

Every doctype that can receive imported data should include:

```
external_id       Data        # e.g. "ABP2-I134" or Zoho's internal numeric ID
external_source   Select      # "zoho_projects", "jira", "linear", "csv", ""
external_url      Data        # deep link back to source for debugging
imported_at       Datetime    # when the import ran
```

Index `(external_source, external_id)` unique — prevents double-imports, enables idempotent re-runs.

## ID / auto-numbering

Zoho format: `<project_prefix>-<type_letter><counter>`
- `ABP2-I134` = SEPPL project, Query/Issue #134
- `AQ1-I6` = Adil Qadri project, Query/Issue #6

Orbit must support this format so imported IDs stay identical. Implementation: Issue `name` field is not an autoname random hash — it's `format:{project.identifier}-{type_letter}{counter}`. Counter is per-project + per-type.

## Importer module (future — not built yet)

When we build it, it lives at `orbit/orbit/orbit_import/`:

```
orbit_import/
  __init__.py
  base.py              # BaseImporter class with idempotency helpers
  sources/
    zoho_projects.py   # Zoho API + CSV/XLSX import
    jira.py
    linear.py
    csv.py
  api.py               # whitelisted methods to kick off imports from UI
  test_zoho_projects.py
```

Zoho Projects has a REST API and a `.xls`/`.csv` export. Start with CSV (lower barrier than API tokens).

## Design constraints this places on upcoming doctypes

When we build the net-new doctypes, enforce:

1. **Workspace** — just identifier + display name; import fields included (done, 2026-04-19)
2. **Project** (custom fields on Frappe Project) — `identifier` (required, unique, e.g. "ABP2"), `external_id`, `external_source`, `external_url`, `orbit_workspace` (Link to Orbit Workspace)
3. **Orbit Task Type** — per-workspace, list of types (Task/Query/Bug/Story/etc.), each with icon + color + letter-prefix used in ID format (Q for Query, B for Bug, etc.)
4. **Orbit Workflow State** — per-project status list (not a closed enum), with color + group (Backlog/Unstarted/Started/Completed/Cancelled), supports Zoho's arbitrary status strings
5. **Task** (custom fields on Frappe Task) — `task_type` (Link to Orbit Task Type), `reporter` (Link User), `external_id`, `external_source`, `external_url`, auto-name format preserving Zoho's ID
6. **Milestone** — goal-based, optional target date, belongs to a Project. NOT time-boxed. NO burndown. NO "Cycle" doctype.
7. **View** — saved filter config; import Zoho custom views as these
