<script setup lang="ts">
import type { CategoriaGrupo, Grupo } from '~/composables/useGrupos'

// `categoria`: mostra a etiqueta da categoria (lista de Grupos). Na página da categoria não precisa.
const props = defineProps<{ grupo: Grupo, categoria?: CategoriaGrupo, posicao?: number, entradaAtiva?: boolean, lotado?: boolean, semCategoria?: boolean }>()
defineEmits<{ abrir: [], ofertas: [recebe: boolean] }>()

const ocupacao = computed(() => Math.min(props.grupo.membros / props.grupo.capacidade, 1))
const iniciais = computed(() => props.grupo.nome.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase())
</script>

<template>
  <div
    class="flex items-center gap-3 p-4 transition-colors"
    :class="entradaAtiva && 'bg-whatsapp/[.05]'"
  >
    <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="$emit('abrir')">
      <span class="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-label font-semibold">
        <img v-if="grupo.foto" :src="grupo.foto" alt="" loading="lazy" class="size-11 rounded-full object-cover">
        <template v-else>{{ iniciais }}</template>
        <span
          v-if="posicao"
          class="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-elevated bg-fg text-[10px] text-bg"
        >{{ posicao }}</span>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold">{{ grupo.nome }}</span>
        <span class="mt-1 flex items-center gap-2">
          <span class="h-1.5 w-20 overflow-hidden rounded-full bg-line">
            <span
              class="block h-full rounded-full transition-[width] duration-700 ease-out"
              :class="lotado ? 'bg-status-rejeitada' : 'bg-fg'"
              :style="{ width: `${ocupacao * 100}%` }"
            />
          </span>
          <span class="text-[12px] tabular-nums text-muted">{{ grupo.membros.toLocaleString('pt-BR') }}/{{ grupo.capacidade.toLocaleString('pt-BR') }}</span>
        </span>
        <span class="mt-1.5 flex flex-wrap gap-1.5">
          <span v-if="categoria" class="inline-flex h-6 max-w-[12rem] items-center gap-1 rounded-full bg-fg px-2 text-[12px] font-semibold text-bg">
            <span>{{ categoria.emoji }}</span><span class="truncate">{{ categoria.nome }}</span>
          </span>
          <span v-else-if="semCategoria" class="inline-flex h-6 items-center rounded-full border border-dashed border-line px-2 text-[12px] text-muted">Sem categoria</span>
          <span v-if="entradaAtiva" class="inline-flex h-6 items-center gap-1 rounded-full bg-whatsapp/15 px-2 text-[12px] font-semibold">
            <span class="size-1.5 animate-pulse rounded-full bg-whatsapp" /> Recebendo membros
          </span>
          <span v-else-if="lotado" class="inline-flex h-6 items-center rounded-full bg-status-rejeitada/10 px-2 text-[12px] font-semibold text-status-rejeitada">Lotado</span>
          <span v-if="!grupo.podeEnviar" class="inline-flex h-6 items-center gap-1 rounded-full bg-status-rejeitada/10 px-2 text-[12px] font-semibold text-status-rejeitada">
            <UiIcone nome="alerta" :tamanho="12" /> Você não pode enviar
          </span>
          <span v-else-if="!grupo.admin" class="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-[12px] text-muted">
            <UiIcone nome="alerta" :tamanho="12" /> Não é admin
          </span>
          <span v-if="grupo.soAdmins" class="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-[12px] text-muted">
            <UiIcone nome="cadeado" :tamanho="12" /> Só admins falam
          </span>
        </span>
      </span>
    </button>
    <UiBotao v-if="semCategoria" variante="secundario" tamanho="sm" @click="$emit('abrir')">Definir</UiBotao>
    <UiInterruptor v-else :model-value="grupo.recebeOfertas" @update:model-value="$emit('ofertas', $event)" :aria-label="`Enviar ofertas para ${grupo.nome}`" />
  </div>
</template>
