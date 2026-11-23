import { createResource } from 'frappe-ui'

const cache = new Map()

/**
 * Modules and milestones for one project, each row already carrying its task
 * counts and progress percentage (computed server-side in
 * orbit.api.planning so the client never fetches every task to draw a bar).
 *
 * Cached per project so the Modules tab, the Milestones tab and the task
 * sidebar share one fetch.
 */
export function usePlanning(projectName) {
  if (cache.has(projectName)) return cache.get(projectName)

  const modules = createResource({
    url: 'orbit.api.planning.get_modules',
    params: { project: projectName },
    auto: true,
    cache: `orbit-modules-${projectName}`,
  })

  const milestones = createResource({
    url: 'orbit.api.planning.get_milestones',
    params: { project: projectName },
    auto: true,
    cache: `orbit-milestones-${projectName}`,
  })

  const api = {
    modules,
    milestones,
    reload() {
      modules.reload()
      milestones.reload()
    },
  }

  cache.set(projectName, api)
  return api
}

export function clearPlanningCache(projectName) {
  cache.delete(projectName)
}
