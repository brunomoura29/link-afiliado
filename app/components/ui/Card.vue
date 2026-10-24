<script setup lang="ts">
defineProps<{ interativo?: boolean }>()
</script>

<template>
  <div
    class="rounded-lg border border-line bg-elevated shadow-card"
    :class="interativo && 'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-pop'"
  >
    <slot />
  </div>
</template>
