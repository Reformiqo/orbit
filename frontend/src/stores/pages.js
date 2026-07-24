import { createListResource } from 'frappe-ui'

const cache = new Map()

/**
 * createListResource for Orbit Pages scoped to a specific project. Cached
 * per project so the tree + editor share a single fetch.
 *
 * Includes archived pages by default — callers can filter client-side if
 * they want the archived view hidden.
 */
export function usePagesForProject(projectName) {
  if (cache.has(projectName)) return cache.get(projectName)

  const resource = createListResource({
    doctype: 'Orbit Page',
    fields: [
      'name',
      'title',
      'project',
      'parent_page',
      'icon',
      'position',
      'is_archived',
      'modified',
    ],
    filters: { project: projectName },
    orderBy: 'position asc, modified desc',
    pageLength: 500,
    auto: true,
    cache: `orbit-pages-${projectName}`,
  })

  cache.set(projectName, resource)
  return resource
}

export function clearPageCache(projectName) {
  cache.delete(projectName)
}
