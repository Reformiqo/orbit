import { createListResource } from 'frappe-ui'

const cache = new Map()

/**
 * Fetch Orbit Task Types for a workspace (Task, Bug, Story, Query, Epic, ...).
 * Cached per workspace so components share one fetch.
 */
export function useTaskTypesForWorkspace(workspaceName) {
  if (!workspaceName) workspaceName = '__none__'
  if (cache.has(workspaceName)) return cache.get(workspaceName)

  const resource = createListResource({
    doctype: 'Orbit Task Type',
    fields: [
      'name',
      'type_name',
      'letter_prefix',
      'color',
      'icon',
      'position',
      'is_default',
    ],
    filters: { workspace: workspaceName },
    orderBy: 'position asc',
    pageLength: 100,
    auto: workspaceName !== '__none__',
    cache: `orbit-task-types-${workspaceName}`,
  })

  cache.set(workspaceName, resource)
  return resource
}
