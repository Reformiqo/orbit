import { createListResource } from 'frappe-ui'

const cache = new Map()

export function useTasksForProject(projectName) {
  if (cache.has(projectName)) return cache.get(projectName)

  const resource = createListResource({
    doctype: 'Task',
    fields: [
      'name',
      'subject',
      'project',
      'status',
      'priority',
      'exp_end_date',
      'orbit_display_id',
      'orbit_workflow_state',
      'orbit_reporter',
      '_assign',
      'modified',
    ],
    filters: { project: projectName },
    orderBy: 'modified desc',
    pageLength: 500,
    auto: true,
    cache: `orbit-tasks-${projectName}`,
  })

  cache.set(projectName, resource)
  return resource
}

export function clearTaskCache(projectName) {
  cache.delete(projectName)
}
