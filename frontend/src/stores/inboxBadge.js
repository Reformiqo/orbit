import { defineStore } from 'pinia'
import { ref } from 'vue'
import { call } from 'frappe-ui'

export const useInboxBadge = defineStore('inboxBadge', () => {
  const count = ref(0)
  let inflight = null

  async function refresh() {
    if (inflight) return inflight
    inflight = call('orbit.notifications.get_unread_count')
      .then((n) => {
        count.value = Number(n) || 0
      })
      .catch(() => {})
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  return { count, refresh }
})
