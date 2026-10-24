<script setup lang="ts">
defineProps<{ id: string, numero: string, titulo: string, descricao?: string }>()
</script>

<template>
  <section :id="id" class="scroll-mt-28 py-10 sm:py-14">
    <header v-reveal class="mb-6">
      <p class="text-label font-semibold text-muted">{{ numero }}</p>
      <h2 class="text-title">{{ titulo }}</h2>
      <p v-if="descricao" class="mt-1 max-w-prose text-muted">{{ descricao }}</p>
    </header>
    <slot />
  </section>
</template>
