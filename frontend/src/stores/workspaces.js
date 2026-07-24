import { defineStore } from 'pinia'
import { createListResource } from 'frappe-ui'

export const useWorkspacesStore = defineStore('workspaces', () => {
  const workspaces = createListResource({
    doctype: 'Orbit Workspace',
    fields: [
      'name',
      'workspace_name',
      'slug',
      'icon',
      'description',
      'modified',
      'external_source',
    ],
    orderBy: 'modified desc',
    pageLength: 100,
    auto: true,
    cache: 'orbit-workspaces',
  })

  return { workspaces }
})
