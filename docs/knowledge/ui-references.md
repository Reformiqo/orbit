# UI References

Orbit's UI pairs two influences: modern project-management layout conventions and the Frappe CRM component library. When building a screen, consult both.

## Rule of thumb

| Question | Source |
|---|---|
| Layout, grouping, affordances | Modern PM layout conventions (documented below) |
| What component renders each piece? (Button, Dialog, Dropdown, Chip) | **Frappe CRM** (`/home/frappe/v16/apps/crm`) |
| Colors, spacing, typography, border-radius, icons | **Frappe CRM / Espresso design tokens** |

## Layout conventions we follow

### Two-rail sidebar (for workspace-level chrome)
- **Left rail (~56px):** app-switcher icons (e.g. Projects, Pages, Inbox, Settings)
- **Secondary rail (~240px):** workspace switcher at top, contextual nav list, project list with colored icons/emojis below
- Collapsible; state persists per user

### Top bar
- Global search with `⌘K` shortcut (command palette)
- Inbox icon, Help icon, Profile avatar on right
- Slim — match the CRM top bar density

### Project page with tabs
- Header: icon/emoji + project name
- Tabs: **Overview · Epics · Work items · Cycles · Modules · Pages · Views · Settings**
- Active tab underlined; right side has link-copy + overflow menu
- Below tabs: view-specific toolbar (count, view switcher `List/Kanban/...`, filter, group-by, columns, Add button)

### Stacked grouped list view (signature pattern)
This is the primary work-item list style:

- **Group header:** status circle icon + status label + count (e.g. ○ Backlog, ◐ To do, ◑ In Progress, ● Done, ✕ Cancelled). Click to collapse.
- **Row layout (left → right):**
  1. ID chip with colored type icon (`ABP2-134` with a small colored glyph = work item type: Bug/Story/Task/Query)
  2. Title (truncates with ellipsis)
  3. **Right-aligned metadata cluster:** assignee avatar(s) → label chips (colored dot + name, e.g. `● Enhancement`) → due date chip (`📅 22 Dec`) → priority indicator (small bar icon)
- Hover row: subtle background, reveal quick actions
- Whole row clickable → opens issue detail (modal or side panel)

### Work item row metadata chips
- Assignee: stacked circular avatars (show up to 3, then `+N`)
- Labels: pill with colored dot — `● Enhancement`, `● Mobile`, `● Editor`
- Date: leading calendar icon + short date (`22 Dec`, `03 Mar`)
- Priority: vertical bar icon (1–4 bars filled = priority level)

### Modules / Milestones
- Module page: grouped list of tasks scoped to that module
- Milestone page: goal + optional target date + progress bar (fraction of child tasks done) + stacked grouped list of tasks in the milestone
- Both live inside a project's sub-nav (ADR-0009). No workspace-level Module or Milestone list.

### Pages (wiki)
- Nested tree in sidebar
- TipTap editor in main area
- Slash commands for embeds (issue, table, image)

## CRM component conventions we follow

- **Single-rail sidebar width** and hover states — CRM uses a clean single rail; we use two-rail only when the main app chrome needs it. Sub-pages inside a project use single-rail + breadcrumb.
- **Breadcrumb + view switcher** pattern on top of list (`Leads /` + `List ⌄`)
- **Filter bar** with inline column chips + right-side actions (Refresh · Filter · Sort · Columns · overflow)
- **Empty state:** centered illustration/icon + title + subtitle + inline CTA hint
- **Getting Started card** at bottom of sidebar (onboarding checklist)
- **Create button** styled as CRM's (dark pill with `+` icon, top-right)

## Home page (personal dashboard) spec

Home is the current user's "what should I do next" view — **not** org-wide analytics. Org metrics live in a future Analytics page.

Layout:

1. **Header:** "Home" title + greeting with user's first name on the right
2. **Stat tiles row (4 cards):**
   - Issues assigned to you
   - Pending issues (all open, across projects)
   - Completed this week
   - Due this week
3. **Overdue Issues** — table: Issue · Due Date · Project. Empty state: icon + "No overdue issues. Press `C` to create a new issue."
4. **Upcoming Issues** — table: Issue · Start Date · Project. Same empty-state pattern.
5. **My cycles in progress** — compact list of cycles user has assigned issues in, with progress bar
6. **Recent activity** — last 10 events across user's projects (status changes, comments, new issues), each linked

Empty-state shortcut hints (`Press C to create`, `Press /` to search) come from the command palette bindings — reinforces keyboard-first UX.

Skipped intentionally:
- GitHub-style contribution heatmap — low signal for daily action, moved to Analytics
- Org-wide charts (burndown, velocity, cumulative flow) — Analytics
- Project-level dashboards — live on each project's Overview tab

Build order note: wait until Issue and Cycle doctypes exist before wiring the tiles — otherwise everything shows 0 and the design can't be validated.

## Non-goals

- Don't copy any specific third-party PM tool's color scheme, icon set, or branding — use Espresso / Frappe UI tokens and the `frappe-ui` Lucide set.
- Don't pull in shadcn, Radix, or other UI kits — `frappe-ui` is the only component library.

## Before building a screen

1. Sketch the layout from the conventions above
2. Find the closest CRM screen and inspect which `frappe-ui` components it uses (`rg` for `<Button`, `<Dialog`, `<ListView` in `/home/frappe/v16/apps/crm/frontend/src`)
3. Compose: PM layout pattern + CRM components + Espresso tokens
4. Write the Playwright test for the flow before marking done
