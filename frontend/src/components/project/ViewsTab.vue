<template>
  <RichEmptyState
    test-id="project-views-empty"
    :icon="Eye"
    title="No saved views yet"
    description="A view is a saved filter — a combination of status, assignee, priority, and grouping you can return to with one click. Team members can share views so everyone sees the same slice of work."
    cta-label="Create view — coming soon"
    :cta-icon="Plus"
    :cta-disabled="true"
    cta-tooltip="Saved views are on the roadmap. Coming soon."
  />
</template>

<script setup>
import Eye from '~icons/lucide/eye'
import Plus from '~icons/lucide/plus'
import RichEmptyState from './RichEmptyState.vue'

defineProps({
  projectId: { type: String, required: true },
})
</script>
