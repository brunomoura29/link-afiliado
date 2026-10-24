<script setup lang="ts">
// claro = para fundos escuros fixos (ex.: painel da vitrine)
defineProps<{ claro?: boolean }>()
</script>

<template>
  <span class="flex items-center gap-2.5">
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-lg"
      :class="claro ? 'bg-white text-[#0d0d0d]' : 'bg-fg text-bg'"
    >
      <UiIcone nome="link" :tamanho="18" :traco="2.5" />
    </span>
    <span class="font-semibold">LinkAfiliado</span>
  </span>
</template>
