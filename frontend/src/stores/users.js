import { createListResource } from 'frappe-ui'

let resource

export function useUsers() {
  if (resource) return resource
  resource = createListResource({
    doctype: 'User',
    fields: ['name', 'full_name', 'user_image', 'enabled', 'user_type'],
    filters: { enabled: 1, user_type: 'System User' },
    orderBy: 'full_name asc',
    pageLength: 500,
    auto: true,
    cache: 'orbit-users',
  })
  return resource
}
