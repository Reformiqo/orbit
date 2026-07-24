<template>
  <RichEmptyState
    test-id="project-modules-empty"
    :icon="Package"
    title="No modules yet"
    description="A module is a cross-cycle bucket of tasks working toward a shared outcome — like Billing, Onboarding, or Mobile. Use modules to group related work that spans multiple sprints or releases."
    cta-label="Create module — coming soon"
    :cta-icon="Plus"
    :cta-disabled="true"
    cta-tooltip="Modules are on the roadmap. Coming soon."
  />
</template>

<script setup>
import Package from '~icons/lucide/package'
import Plus from '~icons/lucide/plus'
import RichEmptyState from './RichEmptyState.vue'

defineProps({
  projectId: { type: String, required: true },
})
</script>
