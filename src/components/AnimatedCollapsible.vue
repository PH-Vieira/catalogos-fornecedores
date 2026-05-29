<template>
  <div
    class="collapsible-grid"
    :class="{ 'collapsible-grid--open': open }"
  >
    <div class="collapsible-grid__clip">
      <div class="collapsible-grid__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()
</script>
