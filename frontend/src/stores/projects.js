import { defineStore } from 'pinia'
import { watch } from 'vue'
import { createListResource } from 'frappe-ui'
import { useCurrentWorkspace } from '@/composables/currentWorkspace'

export const useProjectsStore = defineStore('projects', () => {
  const { currentWorkspace } = useCurrentWorkspace()

  const projects = createListResource({
    doctype: 'Project',
    fields: [
      'name',
      'project_name',
      'status',
      'orbit_identifier',
      'orbit_workspace',
      'orbit_external_source',
      'modified',
    ],
    filters: { orbit_workspace: '__none__' },
    orderBy: 'modified desc',
    pageLength: 200,
    auto: false,
    cache: 'orbit-projects',
  })

  // Only fetch once we know which workspace to scope to.
  watch(
    () => currentWorkspace.value?.name,
    (ws) => {
      if (!ws) return
      projects.update({ filters: { orbit_workspace: ws } })
      projects.reload()
    },
    { immediate: true },
  )

  return { projects }
})
