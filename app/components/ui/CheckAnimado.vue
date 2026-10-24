<script setup lang="ts">
withDefaults(defineProps<{ tamanho?: number }>(), { tamanho: 18 })
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M20 6 9 17l-5-5"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="24"
      class="animate-draw"
    />
  </svg>
</template>
