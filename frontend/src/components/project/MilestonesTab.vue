<template>
  <RichEmptyState
    test-id="project-milestones-empty"
    :icon="Target"
    title="No milestones yet"
    description="A milestone is a goal-based checkpoint with an optional target date — like 'Public beta' or 'v1.0 launch'. Track progress by attaching tasks that must complete before the milestone is reached."
    cta-label="Create milestone — coming soon"
    :cta-icon="Plus"
    :cta-disabled="true"
    cta-tooltip="Milestones are on the roadmap. Coming soon."
  />
</template>

<script setup>
import Target from '~icons/lucide/target'
import Plus from '~icons/lucide/plus'
import RichEmptyState from './RichEmptyState.vue'

defineProps({
  projectId: { type: String, required: true },
})
</script>
