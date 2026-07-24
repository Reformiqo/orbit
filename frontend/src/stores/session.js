import { defineStore } from 'pinia'
import { createResource, frappeRequest } from 'frappe-ui'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const user = ref(window.frappe?.boot?.user?.name || window.user_id || '')

  // Boot data may not include user_id — fetch from the auth API as fallback.
  if (!user.value) {
    frappeRequest({ url: '/api/method/frappe.auth.get_logged_user' })
      .then((res) => {
        // Response shape: { message: "user@example.com" } via frappeRequest
        const name = typeof res === 'string' ? res : res?.message || res
        if (name) user.value = name
      })
      .catch(() => {})
  }

  const userResource = createResource({
    url: 'frappe.client.get_value',
    params: {
      doctype: 'User',
      filters: { name: user.value || 'Administrator' },
      fieldname: ['full_name', 'user_image', 'username'],
    },
    auto: true,
    transform: (data) => data || {},
  })

  const fullName = computed(
    () => userResource.data?.full_name || user.value || 'User',
  )
  const userImage = computed(() => userResource.data?.user_image || '')
  const isLoggedIn = computed(() => !!user.value && user.value !== 'Guest')

  function logout() {
    window.location.href = '/?cmd=logout'
  }

  return { user, fullName, userImage, isLoggedIn, logout }
})
