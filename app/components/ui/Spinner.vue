<script setup lang="ts">
withDefaults(defineProps<{ tamanho?: number }>(), { tamanho: 18 })
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 24 24" class="animate-spin" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" opacity=".2" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
