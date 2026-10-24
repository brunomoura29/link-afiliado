<script setup lang="ts">
defineProps<{ rotulo: string, descricao?: string }>()
const ligado = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between gap-4">
    <span>
      <span class="block">{{ rotulo }}</span>
      <span v-if="descricao" class="block text-label text-muted">{{ descricao }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="ligado"
      class="relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-300"
      :class="ligado ? 'bg-fg' : 'bg-line'"
      @click="ligado = !ligado"
    >
      <span
        class="absolute left-1 top-1 size-6 rounded-full bg-bg shadow-card transition-transform duration-500 ease-spring"
        :class="ligado ? 'translate-x-5' : 'translate-x-0'"
      />
    </button>
  </label>
</template>
