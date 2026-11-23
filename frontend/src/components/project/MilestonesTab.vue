<template>
  <PlanningList :projectId="projectId" kind="milestone" />
</template>

<script setup>
import PlanningList from './PlanningList.vue'

defineProps({
  projectId: { type: String, required: true },
})
</script>
