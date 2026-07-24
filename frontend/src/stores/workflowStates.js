import { createListResource } from 'frappe-ui'

const cache = new Map()

/**
 * createListResource for workflow states scoped to a specific project. Cached
 * per project so multiple components share one fetch.
 */
export function useWorkflowStatesForProject(projectName) {
  if (cache.has(projectName)) return cache.get(projectName)

  const resource = createListResource({
    doctype: 'Orbit Workflow State',
    fields: [
      'name',
      'state_name',
      'status_group',
      'color',
      'position',
      'is_default',
    ],
    filters: { project: projectName },
    orderBy: 'position asc',
    pageLength: 100,
    auto: true,
    cache: `orbit-states-${projectName}`,
  })

  cache.set(projectName, resource)
  return resource
}
