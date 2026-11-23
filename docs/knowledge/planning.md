# Planning: Modules and Milestones

Two ways to slice a project that are not the task list.

- **Module** — a cross-cycle bucket of work toward a shared outcome (Billing, Onboarding, Mobile). Has a start date and a target date, and a `Paused` status, because it is a span of work.
- **Milestone** — a goal-based checkpoint (Public beta, v1.0 launch). Target date only, no start, no `Paused`, because it is a point in time.

Both are project-scoped. See ADR-0014 for why.

## Backend

| Thing                     | Where                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Doctypes                  | `orbit/orbit/doctype/orbit_module/`, `.../orbit_milestone/`                                                 |
| Shared validation helpers | `orbit_milestone.py` (`validate_unique_name_in_project`, `validate_target_after_start`, `clear_task_links`) |
| Task link fields          | `orbit_module`, `orbit_milestone` in `orbit/setup/custom_fields.py`                                         |
| Same-project guard        | `orbit.overrides.task._validate_planning_links`                                                             |
| Cascade on project delete | `orbit.overrides.project.on_trash`                                                                          |
| API                       | `orbit/api/planning.py`                                                                                     |
| Tests                     | `orbit/tests/test_planning.py`, `frontend/tests/project-planning.spec.ts`                                   |

### API

```
orbit.api.planning.get_modules(project)          -> [row, ...]
orbit.api.planning.get_milestones(project)       -> [row, ...]
orbit.api.planning.get_planning_overview(project)-> {modules, milestones, unassigned}
orbit.api.planning.set_task_planning(tasks, module=None, milestone=None) -> {updated}
```

Every row carries its own counts, so the client never fetches tasks to draw a bar:

```
total     every task linked to this bucket
done      status_group == "Completed"
dropped   status_group == "Cancelled"
started   status_group == "Started"
open      everything not done and not dropped
progress  round(done / (total - dropped) * 100), 0 when nothing countable
```

`set_task_planning` distinguishes **omit** from **clear**: pass `None` (omit the argument) to leave a field alone, pass `""` to null it. Both forms route through `doc.save()`, so the same-project rule runs.

### Gotchas

- Progress keys off `Orbit Workflow State.status_group`, **not** `Task.status`. A project with custom states would be miscounted otherwise.
- `on_trash` detaches tasks instead of cascading into them. Deleting a module must never delete work.
- Writing `orbit_module` with `frappe.db.set_value` skips the same-project validation. That is fine in seed scripts that derive the link from the project's own rows; never do it from user input.
- `position` auto-increments by 10 on insert when left at 0, so manual reordering has gaps to slot into.

## Frontend

`PlanningList.vue` renders **both** tabs, parameterised by `kind: 'module' | 'milestone'`. `ModulesTab.vue` and `MilestonesTab.vue` are three-line wrappers. Config (doctype, name field, labels, statuses, whether a start date applies, empty-state copy) lives in the `CONFIG` map at the top of the script block.

The store is `stores/planning.js` → `usePlanning(projectName)`, cached per project, returning `{ modules, milestones, reload }`.

Test IDs follow `project-modules-*` / `project-milestones-*`: `-empty`, `-row`, `-new`, `-dialog`, `-name-input`, `-status-input`, `-target-input`, `-save`, `-delete`, `-progress`, `-target`, `-overdue`.

Overdue is computed client-side and deliberately ignores `Completed` and `Cancelled` rows: a milestone that shipped late is not still overdue.
