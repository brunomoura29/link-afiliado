<script setup lang="ts">
import type { Oferta } from '~/composables/useOfertas'
import type { CategoriaGrupo } from '~/composables/useGrupos'

const props = defineProps<{ oferta: Oferta, categoria?: CategoriaGrupo }>()
defineEmits<{ abrir: [] }>()

const desconto = computed(() => props.oferta.preco != null && props.oferta.original
  ? Math.round((1 - props.oferta.preco / props.oferta.original) * 100) : null)
const progresso = computed(() => {
  const e = props.oferta.envios
  return e.length ? `${e.filter(x => x.status === 'enviado').length}/${e.length} grupos` : ''
})
</script>

<template>
  <button type="button" class="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface/60 active:bg-surface" @click="$emit('abrir')">
    <!-- Miniatura -->
    <span
      class="relative flex size-14 shrink-0 items-center justify-center rounded"
      :style="{ background: `linear-gradient(135deg, hsl(${oferta.matiz} 70% 92%), hsl(${oferta.matiz + 40} 70% 82%))` }"
    >
      <img v-if="oferta.imagem" :src="oferta.imagem" alt="" loading="lazy" class="size-full rounded object-cover">
      <UiSpinner v-else-if="!oferta.titulo && oferta.status === 'pendente'" class="text-black/40" />
      <UiIcone v-else nome="sacola" :tamanho="22" :traco="1.5" class="text-black/30" />
      <span
        class="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-elevated"
        :style="{ background: corPlataforma(oferta.plataforma) }"
        :title="nomePlataforma(oferta.plataforma)"
      />
    </span>

    <span class="min-w-0 flex-1">
      <span class="flex items-start justify-between gap-2">
        <span v-if="oferta.titulo" class="line-clamp-1 font-semibold">{{ oferta.titulo }}</span>
        <span v-else class="font-semibold text-muted">{{ oferta.status === 'pendente' ? 'Lendo o produto…' : nomePlataforma(oferta.plataforma) }}</span>
        <UiStatus :status="oferta.status" class="-mt-0.5 shrink-0 scale-90 origin-top-right" />
      </span>

      <span v-if="oferta.status === 'rejeitada' && oferta.motivo" class="mt-0.5 line-clamp-1 text-label text-status-rejeitada">{{ oferta.motivo }}</span>
      <span v-else-if="oferta.preco != null" class="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span class="font-semibold">{{ formatarPreco(oferta.preco) }}<span v-if="oferta.condicao" class="text-label font-normal text-muted"> {{ oferta.condicao }}</span></span>
        <span v-if="oferta.original" class="text-label text-muted line-through">{{ formatarPreco(oferta.original) }}</span>
        <span v-if="desconto" class="text-label font-semibold text-status-aprovada">-{{ desconto }}%</span>
      </span>
      <span v-else class="mt-1.5 block h-3.5 w-32 skeleton" />

      <span class="mt-1 block truncate text-[12px] text-muted">
        {{ categoria?.emoji }} {{ categoria?.nome ?? 'Sem categoria' }} · {{ oferta.origem }} · {{ tempoRelativo(oferta.criadaEm) }}
        <template v-if="oferta.status === 'aprovada' && progresso"> · {{ progresso }}</template>
      </span>
    </span>
  </button>
</template>
