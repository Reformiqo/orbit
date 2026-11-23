<template>
  <PlanningList :projectId="projectId" kind="module" />
</template>

<script setup>
import PlanningList from './PlanningList.vue'

defineProps({
  projectId: { type: String, required: true },
})
</script>
