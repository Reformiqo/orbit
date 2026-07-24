# Orbit Knowledge Base

Running reference for how Orbit is built. Read relevant docs before starting a task; update them after finishing a task if you learned something reusable.

## Index

### Decisions & direction
- [decisions.md](decisions.md) — ADR-style log of architectural choices and why

### UI & design
- [ui-references.md](ui-references.md) — modern PM layout conventions + Frappe CRM for components/tokens; stacked grouped list anatomy, two-rail sidebar, project tabs

### Data model / imports
- [zoho-compatibility.md](zoho-compatibility.md) — Orbit must import Zoho Projects data; required external_id/external_source fields on every importable doctype; Zoho concept → Orbit concept mapping; per-project ID prefixes (ABP2-I134)

### Backend / doctypes
- [doctype-patterns.md](doctype-patterns.md) — directory/file naming, import-compat fields, slug normalize in before_validate, IntegrationTestCase testing pattern, migrate gotcha

### Testing
- [testing.md](testing.md) — Playwright + Frappe setup, test-user seed, auth fixture, selector guidance, 127.0.0.1 vs localhost gotcha, ESM __dirname shim

### Frontend
- [frontend-setup.md](frontend-setup.md) — Vite + Vue 3 + Frappe UI scaffold mirroring CRM; router base must match hooks.py
- [frontend-feature-pattern.md](frontend-feature-pattern.md) — full-stack feature recipe (store + page + dialog + spec); website_route_rules cache gotcha
- [editor.md](editor.md) — TipTap setup plan; three profiles (comment/issue-description/page); mention sources and triggers; MIT core only
- [analytics.md](analytics.md) — workspace-wide dashboard at `/orbit/analytics`; ApexCharts via vue3-apexcharts (lazy-loaded); client-side aggregation over `allTasks` + `allWorkflowStates`; how to add a new chart

### How-to guides
*(populated as we build — don't write speculatively)*

- _(nothing yet — add entries here as we create them)_

## Writing rules

1. **Only document what we actually did** — not speculative "might need this" patterns.
2. **Cite the source** when a pattern is copied from CRM/Helpdesk/Frappe (file path + line, or commit).
3. **Link to code, not prose** — short doc + file references beats a long essay.
4. **Update, don't duplicate** — if a doc on `realtime.md` exists, extend it; don't write `realtime2.md`.
5. **Kill stale docs** — if something is no longer true, delete or mark deprecated. Stale docs are worse than missing docs.

## When to read vs. write

- **Starting a task?** Scan this index for relevant topic. Open the doc. Follow the patterns.
- **Finished a task with a reusable insight?** Add or update a doc. One short markdown file per topic.
- **Made an architectural decision?** Append to `decisions.md` as a new ADR entry.
