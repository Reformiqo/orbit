# Architectural Decisions

Append-only log. Most recent at top. Format: ADR number, date, decision, context, consequences.

---

## ADR-0013 — Projects in sidebar as a collapsible section with `+` create, each project expandable
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** The sidebar has two regions:
1. **Top nav** — cross-project destinations: Home · Inbox · My Tasks · Projects · Analytics
2. **Projects section** — a labeled group BELOW the top nav, with a `+` button on the header for inline create. Each project row is expandable → reveals that project's sub-nav (Overview · Tasks · Modules · Milestones · Views · Pages · Settings).

**Why:** Plane's pattern and Frappe CRM's CollapsibleSection pattern — both show that users want quick access to specific projects from anywhere, without having to go through the Projects index page. Also makes "create new project" a single click rather than a flow buried in /orbit/projects.

**Consequences:**
- New component `ProjectsSidebarSection.vue` handles the header, `+` button, empty state, and expanded rows
- Project rows keep their own expand state (sub-nav visible/hidden) in local reactive state — persist later via localStorage if users want
- Clicking `+` emits a `create` event; until the Project doctype is built, it's a no-op TODO
- The top-nav "Projects" entry stays — it goes to `/orbit/projects` (index/all) which is a different surface from picking one specific project

---

## ADR-0012 — Workspace is implicit (single per site); no sidebar switcher
**Date:** 2026-04-19
**Status:** Accepted (supersedes the "drop Workspace" suggestion from the same session)

**Decision:** Keep the `Orbit Workspace` doctype but treat it as **implicit and single-per-site** for the MVP. There is:
- **No workspace switcher** in the sidebar or header
- **No Workspaces nav link** in the sidebar
- **An onboarding dialog** that blocks the app when zero workspaces exist and prompts the user to create one

The `/orbit/workspaces` route and page still exist (accessed from Settings later), so power users can rename, reconfigure, or inspect the workspace. They just aren't surfaced in primary navigation.

**Why:** Frappe's Site is already the tenant boundary, so forcing every user to think about workspaces adds noise. 99% of deployments are single-workspace. But the doctype buys us optionality: if later someone wants multi-workspace (e.g. a consulting firm managing multiple isolated client portals), the plumbing is already there — we just add a switcher UI. Killing the doctype now would make future extension expensive.

**Consequences:**
- `useCurrentWorkspace` composable picks `workspaces.data[0]` as the current one
- `WorkspaceOnboardingDialog.vue` is mounted in `DesktopLayout.vue` and shows whenever `needsOnboarding` is true (non-dismissable)
- The seed (`orbit.tests.seed.ensure_default_workspace`) creates a workspace named "My Team" with slug `default` so tests and fresh installs aren't blocked by onboarding on first run
- Project and Task rows carry a Link to Orbit Workspace (required) — but the UI doesn't make users pick one, it uses the implicit current workspace
- If/when we add multi-workspace support, the switcher goes in the existing user-dropdown (brand tile at the top of the sidebar) as an expansion, not a new nav item

---

## ADR-0011 — Terminology: "Task" not "Issue"; task_type field carries the subtype
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Orbit uses **Task** as the user-facing noun everywhere ("My Tasks", the Tasks tab inside a project, task_type chips). Subtypes are carried on a `task_type` Link field: `Task` (internal work, default), `Bug`, `Story`, `Query` (client-reported, from Zoho), `Spike`, `Epic`. Underlying doctype is Frappe's existing `Task` extended with custom fields.

**Why:** Frappe's doctype is literally called Task. Using "Issue" in the UI would create permanent cognitive divergence between the doctype and the label — every new dev/user would have to learn the mapping. ERPNext users already know Task. Zoho's Task-vs-Query distinction maps cleanly to a task_type field on a single doctype. This avoids forking terminology from the Frappe ecosystem and keeps imports simpler.

**Consequences:**
- All UI copy uses Task / Tasks — never Issue / Issues
- `task_type` is a Link to an "Orbit Task Type" doctype (configurable per workspace, with icon + color + optional letter prefix used in auto-naming, e.g. `Q` for Query → `ABP2-Q134`)
- "My Issues" route renamed to "My Tasks" (`/my-tasks`)
- Filters, labels, chips, and badges say "Task type: Query" not "Issue type: Query"
- Later: if users insist on "Issue" for client-reported items specifically, we can add a per-workspace label override — but the canonical term stays Task

---

## ADR-0010 — No Cycles (sprints) in MVP; Milestones are the time-anchor
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Orbit does not ship Cycles (time-boxed sprints with burndown) in the MVP. Milestones (goal-based checkpoints with an optional target date) take their place as the primary time anchor. Cycles can be added later behind a feature flag if teams actually want Scrum.

**Why:** The user's actual workflow (evidenced by their Zoho Projects setup) is continuous client work — queries come in, get worked on through statuses like `Under Client Testing` / `Customization` / `Reopen`, and close. There are no 2-week iterations. Cycles are a Scrum/agile-engineering concept that doesn't fit the workflow, and building them would add significant UI (burndown chart, cycle selector, velocity rollup) for zero user value. Milestones map 1:1 to what Zoho Projects already provides and to how the user thinks about timeline.

**Consequences:**
- No `Orbit Cycle` doctype
- `Milestone` doctype gets built instead: goal-based, optional target date, progress rollup from child Tasks, scoped to a Project
- Zoho import: Zoho Milestones → Orbit Milestones (direct 1:1 mapping, not forced into Cycle shape)
- Sidebar and project sub-nav drop Cycles
- If we later add Cycles, they're a separate concept — not a rename of Milestones. Different noun, different fields (start/end dates, burndown), different UI.

---

## ADR-0009 — Project-scoped nav vs workspace-level nav
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** The main (workspace-level) sidebar carries cross-project concerns only. Project-scoped features (Tasks, Modules, Milestones, Views, Pages, Settings) are shown inside a project's own sub-nav, which appears when a project is opened.

- **Workspace sidebar:** Home · Inbox · My Tasks · Workspaces · Projects · Analytics (+ Settings dropdown)
- **Project sub-nav** (shown inside a project): Overview · Tasks · Modules · Milestones · Views · Pages · Settings

**Why:** Modules, Pages, Views only make sense in the context of a specific project. A top-level "Views" link with no project selected is meaningless — it either shows "pick a project first" or dumps everything together, both bad. The standard PM-tool IA (observed in most modern tools) is workspace-level = cross-project resume surface; project-level = the actual work surface. This also keeps the workspace sidebar short and scannable.

**Consequences:**
- Workspace sidebar has 6 items instead of 9 — cleaner, easier scanning
- Pages, Modules, Views, Milestones components will render inside the Project route (`/orbit/projects/<id>/...`) not at the workspace root
- The `Cycles.vue`, `Modules.vue`, `Pages.vue`, `Views.vue` placeholder pages were deleted — they'll be rebuilt as project-scoped sub-routes when we ship the Project feature
- `My Tasks` stays at workspace level — it's the cross-project resume surface for the current user
- `Inbox` stays at workspace level — it aggregates across all projects the user has access to
- `Analytics` stays at workspace level — org/workspace-wide metrics. Per-project analytics live on the project's Overview tab

---

## ADR-0008 — Rich text editor: TipTap
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** TipTap is the rich text editor for every text surface in Orbit — issue descriptions, comments, Pages (wiki). Three usage profiles sharing a common config:

- `comment` — bold, italic, strike, link, inline code, mentions
- `issue-description` — adds lists, code blocks, images, tables
- `page` — adds headings, slash commands, embeds (issue/user/page), task lists

**Why:** Frappe CRM already uses TipTap (`@tiptap/extension-paragraph` in their deps), `frappe-ui` ships TipTap helpers, Frappe Gameplan's wiki is built on it — large body of proven Frappe-specific config we can copy instead of inventing. First-class Vue 3 support via `@tiptap/vue-3`, MIT core, huge extension ecosystem.

Alternatives considered and rejected:
- **Milkdown** — markdown-native, but Orbit stores in doctypes, so markdown-as-source-of-truth adds complexity without benefit
- **BlockNote / Novel** — Notion-style block editors, but React-only (no Vue bindings)
- **Lexical** — fast but weaker Vue ecosystem

**Consequences:**
- Add `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-mention`, `@tiptap/extension-table`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
- Shared editor component at `frontend/src/components/editor/` with profile prop — do not fork per-surface
- Mentions integrate with Orbit user list and issue list (each profile controls which mention sources are active)
- Never use TipTap Pro extensions — stay on MIT core (no AI, no collab cursors initially)
- Copy CRM's TipTap config as the starting point before writing from scratch

---

## ADR-0007 — Members lives under Settings, not in the main sidebar
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** User/member management (list, invite, roles, permissions) lives in the Settings modal under `User Management`, not as a first-class sidebar nav item. Sidebar carries: Home · Inbox · My Issues · Projects · Cycles · Modules · Pages · Views.

**Why:** Members is a settings concern — it's infrequently accessed and clutters primary navigation. Frappe CRM demonstrates this pattern: Users, Invite User, Permissions are all under Settings. Keeping the main sidebar focused on daily work items improves the cognitive load for common flows.

**Consequences:**
- `Members.vue` page deleted; `/members` route removed
- Settings modal (to be built) will have a left sub-nav mirroring CRM's: `User Configuration · System Configuration · User Management · Email · Automation & Rules · Customization · Integrations`
- "Invite" / onboarding CTAs outside Settings deep-link into the modal at the right sub-section

---

## ADR-0006 — Data model must be Zoho Projects import-compatible
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Every importable doctype (Workspace, Project, Issue, Cycle, Milestone, View, Workflow State) carries `external_id`, `external_source`, `external_url` fields. Issues have a first-class `issue_type` (Task/Query/Bug/Story/...) and a `reporter` field separate from assignee. Project has an `identifier` (prefix like "ABP2") and Issues auto-name as `{prefix}-{type_letter}{counter}` to preserve Zoho IDs like `ABP2-I134`.

**Why:** User runs Zoho Projects today. Migration requires preserving historical IDs (referenced in external chats/emails), reporter context, custom statuses (`Under Client Testing`, `Customization`, etc.), and the Query-vs-Task distinction Zoho makes. Designing for import late means redoing doctypes and schema, which is expensive.

**Consequences:**
- `issue_type` is a linked doctype, not an enum — configurable per workspace
- `workflow_state` is a linked doctype, not an enum — configurable per project, preserves arbitrary Zoho status strings with colors
- Unique index on `(external_source, external_id)` prevents double-imports; allows idempotent re-sync
- A future `orbit_import` module will plug in Zoho/Jira/Linear/CSV importers against the existing schema — no schema changes needed when importer is added
- Full mapping & design contract: [docs/knowledge/zoho-compatibility.md](../zoho-compatibility.md)

---

## ADR-0005 — Every feature has backend + frontend tests (Frappe tests + Playwright)
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** No feature is "done" until it has:
- A backend test using Frappe's test framework (`test_*.py`) — covering doctype logic, permissions, whitelisted API methods, hooks
- A frontend test using Playwright — covering the user-visible flow end-to-end (create, edit, filter, view switch, realtime update, keyboard shortcut)

**Why:** User explicitly required this. PM features are easy to break subtly when layered — Kanban drag, realtime updates, filter persistence all have many moving parts. Tests at both layers catch regressions the other layer can't see. Playwright in particular validates that realtime events, command palette shortcuts, and view transitions actually work in a browser.

**Consequences:**
- `frontend/tests/` holds Playwright specs; add `@playwright/test` to `frontend/package.json`
- Backend tests live next to the doctype: `orbit/orbit/doctype/<name>/test_<name>.py`
- CI (when added) runs both suites on every push
- Document reusable test helpers (e.g. login fixture, seed a workspace) in `docs/knowledge/testing.md`

---

## ADR-0004 — UI style follows Frappe CRM (Espresso design)
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Orbit's UI matches the Frappe CRM look and feel — same Frappe UI components, same Espresso design tokens, same spacing/typography/color conventions. Feature set aims at a comprehensive modern PM tool; visual language stays CRM-consistent.

**Why:** Keeps visual consistency with other Frappe apps the user runs, leverages a proven design system, avoids the effort and risk of inventing a new design language.

**Consequences:**
- Every new Vue component checks CRM for an existing equivalent before building from scratch
- `frappe-ui` is the component library — do not pull in shadcn, Radix, or other UI kits
- When we need a UI pattern CRM lacks (e.g. Gantt, burndown, grouped stacked list), we build it with `frappe-ui` primitives and style it to match Espresso

---

## ADR-0003 — Reuse Frappe doctypes; only create net-new for missing concepts
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Extend existing Frappe doctypes (Project, Task, ToDo, Comment, User, Tag, etc.) via custom fields rather than creating parallel ones. Create net-new doctypes only for concepts Frappe genuinely lacks.

**Net-new doctypes:** Workspace, Cycle, Module, Initiative, Issue Link, Page, View, Inbox Item, Orbit Workflow State.

**Why:** Avoids duplicating logic Frappe already provides (permissions, comments, attachments, activity log, assignments). Keeps migration paths open — existing Frappe users can adopt Orbit without re-entering data.

**Consequences:**
- Task becomes "Issue" in UI but stays `Task` in DB — custom fields added: story_points, cycle, module, issue_type, parent_issue
- Permission model inherits Project/Task defaults — less to build
- If an advanced PM feature requires structurally different data (e.g. typed issue links), we add a new doctype rather than bending Task

---

## ADR-0002 — Realtime via `frappe.publish_realtime()` (socket.io), not Centrifugo
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Use Frappe's built-in socket.io realtime layer. Do not deploy Centrifugo.

**Why:** Deployment target is Frappe Cloud (managed PaaS) which does not allow running arbitrary services. Centrifugo would require a separate VPS or paid SaaS (Ably/Pusher/Liveblocks). socket.io ships with Frappe and works on Frappe Cloud with zero extra infra. Sufficient for presence, live updates, typing indicators — everything Phase 1 needs.

**Consequences:**
- Publish from Python: `frappe.publish_realtime(event, message, room=...)`
- Subscribe from Vue using the global `socket` (same as CRM)
- Keep a thin realtime service abstraction on frontend so transport can be swapped later if needed
- Scale ceiling: socket.io on a single Frappe Cloud site handles thousands of connections — fine for our scale

---

## ADR-0001 — Architecture: frappe/crm pattern (Vue 3 + Frappe UI + Vite)
**Date:** 2026-04-19
**Status:** Accepted

**Decision:** Orbit follows the `frappe/crm` architecture exactly — decoupled Vue 3 SPA in `/frontend` built with Vite, talking to Frappe via REST. Python/DocType backend in `/orbit`.

**Why:** frappe/crm is a proven, open-source reference for a modern Frappe app. Mirroring its structure removes ~40% of the "how do I wire this" unknowns. The bench already has it installed at `/home/frappe/v16/apps/crm` for direct inspection.

**Consequences:**
- `/frontend/package.json`, `vite.config.js`, `index.html` mirror CRM's
- Entry is a Vue SPA mounted at a Frappe `www/` route (the CRM pattern)
- `frappe-ui` is installed via the same mechanism CRM uses
- Authentication uses Frappe session cookies — no separate auth
