# Orbit — Project Guide for Claude

This file is loaded automatically when Claude works in this repo. Read it first, every session.

## What Orbit is

A modern project management app built as a Frappe app. Goal: deliver a comprehensive PM feature set (Modules, Milestones, Pages, multiple views, command palette, live presence) while using the **Frappe CRM UI style** (Espresso design, Frappe UI components, clean/minimal).

Target deployment: **Frappe Cloud**. This rules out arbitrary services (no Centrifugo, no Docker, no Go daemons). Python deps only.

## Stack (locked in)

- **Backend:** Frappe Framework — Python, DocTypes, REST API, hooks
- **Frontend:** Vue 3 + Frappe UI + Vite, decoupled SPA in `/frontend` (mirror `frappe/crm`)
- **Realtime:** `frappe.publish_realtime()` (built-in socket.io) — NOT Centrifugo
- **UI style:** Frappe CRM / Espresso design system — reuse `frappe-ui` components

## Reference apps (already installed in this bench)

- `/home/frappe/v16/apps/crm` — primary reference. Mirror its architecture, Vite config, Frappe UI setup, socket.io wiring, folder layout.
- `/home/frappe/v16/apps/helpdesk` — secondary reference for list/kanban patterns
- `/home/frappe/v16/apps/frappe` — the framework itself; grep here for API patterns

**Before writing new code, check CRM first.** If CRM already does something (list view, kanban, dialog, realtime event, auth), copy the pattern rather than inventing one.

## Reuse vs. create

**Reuse Frappe's existing doctypes** with custom fields — do not recreate:
- Project, **Task** (stays as "Task" everywhere — see ADR-0011), ToDo, Comment, User, Tag, File, Activity Log, Assignment Rule, Notification, Timesheet

**Create net-new** only for concepts Frappe genuinely lacks:
- Workspace (top-level container above Project) ✓ built
- Module (feature bucket within a project)
- Milestone (goal-based checkpoint, optional target date — replaces the need for Cycles)
- Orbit Task Type (Task/Bug/Story/Query/Spike/Epic — per-workspace, carries color + icon + letter prefix for ID format)
- Task Link (typed: blocks / relates / duplicates)
- Page (TipTap wiki doc, nested)
- View (saved filter config, per project)
- Inbox Item (triage queue)
- Orbit Workflow State (project-scoped, since Frappe Workflow is global)

**NOT building** (ruled out):
- Cycle (sprint-style iterations — ADR-0010; Milestones cover the time-anchor need without the Scrum baggage)

## Testing (mandatory)

**Every feature ships with both backend and frontend tests.** No exceptions.

- **Backend:** Frappe's test framework (`bench --site <site> run-tests --app orbit`). Write `test_*.py` next to the doctype or module it tests. Cover: doctype validation, permissions, API whitelisted methods, hooks, custom business logic.
- **Frontend:** Playwright. Tests live in `frontend/tests/`. Cover: critical user flows (create/edit/delete doc, switch views, filter, realtime updates), each route renders, keyboard shortcuts, command palette.

Workflow for a new feature:
1. Build the doctype/backend. Add `test_<doctype>.py`. Run `bench ... run-tests` green.
2. Build the Vue UI. Add `frontend/tests/<feature>.spec.ts`. Run `yarn playwright test` green.
3. Only then mark the feature done.

If a PR/commit touches a feature without updated tests, it's not complete. Document reusable test patterns in `docs/knowledge/testing.md` as they emerge.

## UI references (layout conventions + CRM components)

Orbit combines two references — **always consult both** before building a screen. Full details in [`docs/knowledge/ui-references.md`](docs/knowledge/ui-references.md).

- **Modern PM layout conventions** → layout patterns, interaction design, information density:
  - Two-rail sidebar (56px app-switcher + 240px contextual nav)
  - **Workspace-level sidebar** (main): Home · Inbox · My Tasks · Projects · Analytics (+ Settings in dropdown) — ADR-0009
  - **Project-level sub-nav** (shown inside an open project): Overview · Tasks · Modules · Milestones · Views · Pages · Settings — ADR-0009
  - **Stacked grouped list** (the signature pattern): collapsible status groups (Backlog/To do/In Progress/Done/Cancelled), each row = ID chip + type icon + title + right-aligned cluster of assignee avatars / label chips / date / priority bar
  - Global search with `⌘K` (command palette)
  - Modules, Milestones, Pages (TipTap wiki)

- **Frappe CRM** (`/home/frappe/v16/apps/crm`) → component library, visual tokens, Frappe-native patterns:
  - `frappe-ui` components (Button, Dialog, ListView, Dropdown, Avatar, etc.) — use these, do not pull in other UI libraries
  - Espresso design tokens (colors, spacing, typography, border-radius, icons)
  - Breadcrumb + view switcher header, inline filter bar, empty-state style, dark pill Create button
  - "Getting Started" onboarding card in sidebar

**Rule:** Layout pattern → build with CRM's `frappe-ui` components and Espresso tokens. When a layout pattern has no CRM equivalent (e.g. stacked group list, burndown chart), build it with `frappe-ui` primitives styled with Espresso tokens.

Before building any screen: (1) sketch from the layout conventions, (2) find the closest CRM screen and grep its Vue source for the components used, (3) compose.

## Zoho Projects import compatibility (design constraint)

User currently runs Zoho Projects and will migrate their data into Orbit. Every importable doctype must support this from day one — retrofitting is expensive. See [`docs/knowledge/zoho-compatibility.md`](docs/knowledge/zoho-compatibility.md) for the full mapping.

Non-negotiables:
- **Every importable doctype carries:** `external_id` (Data), `external_source` (Select: zoho_projects/jira/linear/csv/""), `external_url` (Data), `imported_at` (Datetime). Unique index on `(external_source, external_id)`.
- **Issue has `issue_type` as a Link** (not an enum) — Task, Query, Bug, Story, Spike. Zoho's `Query` is first-class alongside `Task`.
- **Issue has `reporter` as a separate Link to User** — different from assignee. Zoho tracks both.
- **Project has `identifier` / prefix** (e.g. "ABP2" for SEPPL Detox Group). Issue `name` auto-generates as `{project.identifier}-{type_letter}{counter}` (e.g. `ABP2-I134`) so imported Zoho IDs stay identical.
- **Workflow State is a Link doctype, per-project** — never hardcode status values. Zoho has arbitrary statuses (`Under Client Testing`, `Customization`, `Reopen`) that must import verbatim.

Not building the actual `orbit_import` module yet — but the schema must be ready for it.

## Out of scope (for now)

- AI features — explicitly deferred. Do not add LLM calls, RAG, embeddings.
- Mobile app — web-first; responsive is enough.
- Centrifugo / external realtime SaaS — socket.io only.

## Knowledge base (READ BEFORE EVERY TASK)

`docs/knowledge/` is the project's running knowledge base. Structure:

- `docs/knowledge/README.md` — index; scan this first
- `docs/knowledge/decisions.md` — architectural decision log (ADR-style)
- `docs/knowledge/<topic>.md` — topical how-tos we've written (e.g. `realtime.md`, `doctype-patterns.md`)

**Rule:** before starting any non-trivial task, read the relevant knowledge doc. After finishing a task that taught you something reusable, add or update a knowledge doc. Don't write speculative docs — only document things we actually learned.

## Communication style

- Keep responses tight. Code > prose.
- Match the user's pace — they decide fast, want to see progress, dislike over-engineering.
- Don't re-pitch ruled-out options (Centrifugo, AI, fancy stacks).
- Typos are fine; parse through them.

## URL / routing

The Orbit SPA is served at **`/orbit`** on the Frappe site (mirroring how CRM lives at `/crm`). This is achieved via:
- `orbit/www/orbit/index.html` → entry HTML that mounts the Vue SPA
- `vite.config.js` sets `base: '/assets/orbit/frontend/'` for built assets
- Vue Router uses `/orbit` as its base path in production and `/` in dev
- In dev, Vite dev server proxies Frappe API calls to the local bench port
- Deep links like `/orbit/projects/PROJ-1/issues`, `/orbit/inbox`, `/orbit/pages/xxx` must resolve (SPA history mode)

After `bench install-app orbit` and a build, visiting `https://<site>/orbit` must load the SPA.

## Dev environment

- **Bench:** `/home/frappe/v16`
- **Site:** `v16.erpera.io`
- **URL:** `http://localhost:6003`
- **Orbit SPA:** `http://localhost:6003/orbit`

## Common commands

```bash
# Install orbit on the dev site (run from bench root: /home/frappe/v16)
bench --site v16.erpera.io install-app orbit

# Migrate after doctype changes
bench --site v16.erpera.io migrate

# Frontend dev server
cd /home/frappe/v16/apps/orbit/frontend && yarn dev

# Frontend production build
cd /home/frappe/v16/apps/orbit/frontend && yarn build

# Playwright tests
cd /home/frappe/v16/apps/orbit/frontend && yarn test

# Frappe backend tests
bench --site v16.erpera.io run-tests --app orbit
```

## Git

- Remote: `git@github.com:Reformiqo/orbit.git` (SSH — HTTPS OAuth token lacks `workflow` scope). Open source.
- Branch model (Frappe-style): **`develop`** is the integration/default branch (PRs target it); **`version-16`** is the release branch (what `bench get-app --branch version-16` installs / Frappe Cloud deploys).
- Author: khanmomodou101.
- **Never** add `Co-Authored-By: Claude` or any AI/Claude mention to commits or PRs — human-authored history only.
- Only commit when explicitly asked.

### Dev tooling / quality gates
- **Backend:** ruff (lint+format) via `pyproject.toml` + pre-commit; Frappe semgrep + pip-audit in `linter.yml`.
- **Frontend:** own eslint (flat config, `frontend/eslint.config.mjs`) + prettier (`frontend/.prettierrc.json`, 2-space) — run `yarn lint` / `yarn format` in `/frontend`. NOT wired into root pre-commit (that's Python-only).
- **CI (`ci.yml`):** three jobs — `Server` (bench + `run-tests`), `UI (Playwright)` (builds SPA, serves site, runs specs), `Frontend lint + format`. Runs on push to `develop`/`version-16` and all PRs.
- Prettier gotcha: multi-statement inline Vue handlers (`@submit="a(); b = ''"`) break — wrap in an arrow block `() => { a(); b = '' }` or extract a method.
