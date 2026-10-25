<script setup lang="ts">
// Sem `rotulo`, vira só a chave (passe `aria-label` para acessibilidade).
defineProps<{ rotulo?: string, descricao?: string, ariaLabel?: string, disabled?: boolean }>()
const ligado = defineModel<boolean>({ default: false })
</script>

<template>
  <component :is="rotulo ? 'label' : 'span'" class="flex items-center justify-between gap-4" :class="disabled ? 'cursor-wait' : 'cursor-pointer'">
    <span v-if="rotulo">
      <span class="block">{{ rotulo }}</span>
      <span v-if="descricao" class="block text-label text-muted">{{ descricao }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="ligado"
      :aria-label="rotulo ? undefined : ariaLabel"
      :disabled="disabled"
      class="relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-300 disabled:pointer-events-none disabled:opacity-60"
      :class="ligado ? 'bg-fg' : 'bg-line'"
      @click="ligado = !ligado"
    >
      <span
        class="absolute left-1 top-1 size-6 rounded-full bg-bg shadow-card transition-transform duration-500 ease-spring"
        :class="ligado ? 'translate-x-5' : 'translate-x-0'"
      />
    </button>
  </component>
</template>
