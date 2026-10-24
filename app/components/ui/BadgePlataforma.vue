<script setup lang="ts">
import type { Plataforma } from '#shared/utils/plataforma'

// Shopee e Mercado Livre seguem a skill de design (fundo tint).
// As demais lojas usam badge neutro com ponto colorido, para não encher a tela de cores de marca.
defineProps<{ plataforma: Plataforma }>()
</script>

<template>
  <span
    class="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label font-semibold"
    :class="{
      'bg-shopee-tint text-shopee': plataforma === 'shopee',
      'bg-ml-tint text-ml-blue': plataforma === 'mercado_livre',
      'border border-line bg-surface text-fg': plataforma !== 'shopee' && plataforma !== 'mercado_livre'
    }"
  >
    <span
      class="size-2 shrink-0 rounded-full"
      :class="plataforma === 'mercado_livre' && 'ring-1 ring-ml-blue/40'"
      :style="{ background: plataforma === 'mercado_livre' ? 'rgb(var(--ml-yellow))' : corPlataforma(plataforma) }"
    />
    {{ nomePlataforma(plataforma) }}
  </span>
</template>
