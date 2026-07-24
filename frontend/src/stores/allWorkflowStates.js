import { createListResource } from 'frappe-ui'

// Every Orbit Workflow State row across every project. Analytics joins tasks
// to their state (for color + status_group) client-side; mirroring the
// project-scoped `useWorkflowStatesForProject` composable in
// ./workflowStates.js.

let resource

export function useAllWorkflowStates() {
  if (resource) return resource

  resource = createListResource({
    doctype: 'Orbit Workflow State',
    fields: ['name', 'state_name', 'project', 'color', 'status_group'],
    orderBy: 'position asc',
    pageLength: 1000,
    auto: true,
    cache: 'orbit-all-workflow-states',
  })

  return resource
}

export function clearAllWorkflowStatesCache() {
  resource = undefined
}
