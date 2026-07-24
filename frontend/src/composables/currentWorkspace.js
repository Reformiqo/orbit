import { computed } from 'vue'
import { useWorkspacesStore } from '@/stores/workspaces'

/**
 * Orbit is single-workspace for now. The "current" workspace is simply the
 * first one the user has access to. If none exists, onboarding should fire.
 */
export function useCurrentWorkspace() {
  const { workspaces } = useWorkspacesStore()

  const isLoading = computed(() => !workspaces.fetched)
  const currentWorkspace = computed(() => workspaces.data?.[0] || null)
  // Only trust an empty list once the fetch has actually completed —
  // before that, data is undefined and the dialog would flash on first load.
  const needsOnboarding = computed(
    () => workspaces.fetched && (workspaces.data || []).length === 0,
  )

  return { currentWorkspace, isLoading, needsOnboarding }
}
