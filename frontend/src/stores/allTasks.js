import { createListResource } from 'frappe-ui'

// Workspace-level cross-project task resource for the Analytics page.
// Fetched client-side, capped at pageLength=1000 — our data volumes are small
// (hundreds of tasks typical) and client-side grouping is simpler than
// building server-side aggregation whitelisted methods.
//
// Mirrors the shape of useTasksForProject in ./tasks.js, but without a project
// filter so we get every Task the current user is permitted to see.

let resource

export function useAllTasks() {
  if (resource) return resource

  resource = createListResource({
    doctype: 'Task',
    fields: [
      'name',
      'subject',
      'project',
      'priority',
      'exp_end_date',
      'orbit_display_id',
      'orbit_workflow_state',
      'orbit_task_type',
      'orbit_reporter',
      'owner',
      '_assign',
      'creation',
      'modified',
    ],
    orderBy: 'modified desc',
    pageLength: 1000,
    auto: true,
    cache: 'orbit-all-tasks',
  })

  return resource
}

export function clearAllTasksCache() {
  resource = undefined
}
