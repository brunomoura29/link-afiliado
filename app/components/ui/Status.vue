<script setup lang="ts">
import type { StatusPostagem } from '~/utils/plataforma'

defineProps<{ status: StatusPostagem }>()

const ESTILO: Record<StatusPostagem, { rotulo: string, ponto: string, texto: string, fundo: string }> = {
  pendente: { rotulo: 'Pendente', ponto: 'bg-status-pendente', texto: 'text-muted', fundo: 'bg-status-pendente/15' },
  aprovada: { rotulo: 'Aprovada', ponto: 'bg-status-aprovada', texto: 'text-status-aprovada', fundo: 'bg-status-aprovada/10' },
  rejeitada: { rotulo: 'Rejeitada', ponto: 'bg-status-rejeitada', texto: 'text-status-rejeitada', fundo: 'bg-status-rejeitada/10' },
  enviada: { rotulo: 'Enviada', ponto: 'bg-status-enviada', texto: 'text-fg', fundo: 'bg-status-enviada/15' }
}
</script>

<template>
  <span
    class="inline-flex h-7 items-center gap-2 rounded-full px-3 text-label font-semibold"
    :class="[ESTILO[status].fundo, ESTILO[status].texto]"
  >
    <span class="relative flex size-2">
      <span
        v-if="status === 'pendente' || status === 'enviada'"
        class="absolute inset-0 rounded-full"
        :class="[ESTILO[status].ponto, status === 'pendente' ? 'animate-pulse' : 'animate-ring-out']"
      />
      <span class="relative size-2 rounded-full" :class="ESTILO[status].ponto" />
    </span>
    {{ ESTILO[status].rotulo }}
  </span>
</template>
