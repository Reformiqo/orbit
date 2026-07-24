# Analytics

The Analytics page at `/orbit/analytics` is a workspace-level dashboard: four
stat tiles over four chart panels, aggregating every Task the current user can
see across every project they have access to.

Home (personal) vs. Analytics (workspace-wide) is a deliberate split — see
[`ui-references.md`](ui-references.md). Don't fold one into the other.

## Chart library

We use **ApexCharts** via [`vue3-apexcharts`](https://github.com/apexcharts/vue3-apexcharts).

- MIT licensed, no runtime fees
- Pure JS + SVG (no native deps — Frappe Cloud-friendly)
- Vue 3 wrapper is a thin single-file component
- Donut, horizontal bar, line, area, heatmap all in one package

Imported **lazily, page-local** (`defineAsyncComponent`) so the ~137 kB gzip
chart bundle only loads when a user actually opens Analytics. `apexcharts` is
pinned (`~3.45.2` / `~1.5.2`) to keep the wrapper and its peer in sync —
vue3-apexcharts 1.11.x drifted ahead and demanded apexcharts v5, which isn't
published yet.

If you ever reach for a second chart library, stop: ApexCharts covers our
chart types and the SPA already pays the bundle cost.

## Data access strategy

Two read-only stores feed the page:

- [`stores/allTasks.js`](../../frontend/src/stores/allTasks.js) —
  `createListResource` over `Task` with no project filter, `pageLength: 1000`.
  Mirrors `stores/tasks.js` but cross-project.
- [`stores/allWorkflowStates.js`](../../frontend/src/stores/allWorkflowStates.js)
  — `createListResource` over `Orbit Workflow State`, all projects.

Every aggregation (count by state, stacked weekly buckets, top N assignees,
overdue detection) is computed client-side in Vue `computed` blocks inside
`Analytics.vue`. No server-side aggregation endpoints.

### Why client-side?

Expected volume is hundreds of tasks per workspace, not tens of thousands.
Client grouping keeps the backend surface small (no `@whitelist` methods to
maintain, no doctype-level permission logic to re-implement) and dodges the
cache-invalidation headache you get with pre-aggregated rollups.

If a workspace blows past ~5k tasks we'll revisit — likely by adding a
whitelisted `orbit.analytics.summary()` method that returns already-grouped
counts. Until then, simple wins.

### "Completed" and "Open" definitions

A Task counts as **Completed** if its `orbit_workflow_state.status_group` is
`Completed`. **Cancelled** tasks are excluded from Open and Completed — they
don't clutter either bucket. **Open** = not Completed and not Cancelled.

**Overdue** = Open + `exp_end_date` is before today (midnight local).

The completed-tasks-over-time trend uses `Task.modified` as a proxy for the
completion timestamp. A dedicated `completed_at` field would be cleaner; add
one when the first user complains. Until then, `modified` is right more often
than not, because the last write to a Task is usually the state flip.

## Layout

```
/orbit/analytics
├── header: "Analytics / Workspace"
├── stat tiles: Total · Open · Completed · Overdue    (AnalyticsStatTile)
└── chart grid (2×2, stacks on mobile):               (AnalyticsChartCard)
    ├── Tasks by status      — donut  (color from workflow_state.color)
    ├── Tasks by priority    — horizontal bar
    ├── Created vs completed — line, 8 weeks
    └── Top assignees        — horizontal bar, top 8 by open-task count
```

Reusable bits:

- [`AnalyticsStatTile.vue`](../../frontend/src/components/AnalyticsStatTile.vue)
  — label + value + optional icon + hint. `data-testid="stat-<key>"` and
  `stat-<key>-value` for test hooks.
- [`AnalyticsChartCard.vue`](../../frontend/src/components/AnalyticsChartCard.vue)
  — card chrome with title/subtitle and an `empty` slot fallback. Slot for
  the chart itself — keeps the chart type decoupled from the card shell.

## Adding a new chart

1. **Add a computed block in `Analytics.vue`.** Shape it as `{ series, options }`
   to match ApexCharts' contract.
2. **Drop an `<AnalyticsChartCard>` in the grid.** Pass `title`, `subtitle`,
   a unique `test-id` (`chart-<name>`), and set `empty` when the series is
   vacuous.
3. **Render the chart** inside:
   ```vue
   <apexchart
     type="bar"          <!-- or donut / line / area / heatmap -->
     height="260"
     :options="yourChart.options"
     :series="yourChart.series"
   />
   ```
4. **Colors.** Per-slice colors ride with the data (for state-colored charts,
   pass `colors: [...]` in `options`). For generic categorical charts use the
   `PALETTE` constant already defined in `Analytics.vue`.
5. **Testing.** Add a new Playwright assertion: `getByTestId('chart-<name>')`
   plus `.locator('svg').first()` to prove the chart mounted.

Keep per-chart computed blocks short — split helpers into `// ---` sections
rather than letting one megablock balloon. The file already uses that split.

## Testing

See [`frontend/tests/analytics.spec.ts`](../../frontend/tests/analytics.spec.ts).
Important bits:

- Cleanup hooks in `beforeEach` and `afterEach` call
  `cleanup_test_tasks` and `cleanup_test_projects` (prefix `PW `). Always use
  both — tasks orphaned from a deleted project hang around otherwise because
  Frappe doesn't cascade Task deletes.
- Creating Tasks via the REST API needs a CSRF token — `frappe.client.insert`
  rejects POSTs without `X-Frappe-CSRF-Token`. The helper `getCsrfToken(page)`
  navigates to `/orbit`, reads `window.csrf_token` from the boot payload, and
  returns it. Pass the token into every `createTask()` call.
- Assertions on stat values use `>=` rather than `==` — Analytics is
  workspace-wide, and the authenticated user may have real tasks from other
  tests or actual use. Seeding a known delta and checking "at least N" is
  both correct and resilient.

## Files

- Page: `frontend/src/pages/Analytics.vue`
- Stores: `frontend/src/stores/allTasks.js`, `frontend/src/stores/allWorkflowStates.js`
- Components: `frontend/src/components/AnalyticsStatTile.vue`,
  `frontend/src/components/AnalyticsChartCard.vue`
- Tests: `frontend/tests/analytics.spec.ts`
- Deps: `apexcharts`, `vue3-apexcharts` in `frontend/package.json`
