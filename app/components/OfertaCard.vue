<script setup lang="ts">
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'

// `status` só aparece no painel; nas páginas públicas fica sem.
defineProps<{
  titulo: string
  plataforma: Plataforma
  preco: number
  original: number
  categoria?: string
  status?: StatusPostagem
  matiz: number
  compacto?: boolean
}>()
</script>

<template>
  <UiCard interativo class="group overflow-hidden">
    <div
      class="relative flex items-center justify-center overflow-hidden"
      :class="compacto ? 'aspect-square' : 'aspect-[4/3]'"
      :style="{ background: `linear-gradient(135deg, hsl(${matiz} 70% 92%), hsl(${matiz + 40} 70% 82%))` }"
    >
      <UiIcone
        nome="sacola"
        :tamanho="compacto ? 40 : 56"
        :traco="1.5"
        class="text-black/25 transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110"
      />
      <div class="absolute left-2 top-2" :class="!compacto && 'left-3 top-3'">
        <UiBadgePlataforma :plataforma="plataforma" />
      </div>
      <span
        class="absolute rounded-full bg-fg px-2.5 py-1 text-label font-semibold text-bg"
        :class="compacto ? 'bottom-2 right-2' : 'right-3 top-3'"
      >
        -{{ Math.round((1 - preco / original) * 100) }}%
      </span>
    </div>
    <div class="flex flex-col gap-2 p-3" :class="!compacto && 'gap-3 p-4'">
      <p class="line-clamp-2" :class="compacto ? 'min-h-10 text-label' : 'min-h-12'">{{ titulo }}</p>
      <div class="flex flex-wrap items-baseline gap-x-2">
        <span :class="compacto ? 'font-semibold' : 'text-title'">{{ formatarPreco(preco) }}</span>
        <span class="text-label text-muted line-through">{{ formatarPreco(original) }}</span>
      </div>
      <div v-if="categoria || status" class="flex items-center justify-between">
        <span class="text-label text-muted">{{ categoria }}</span>
        <UiStatus v-if="status" :status="status" />
      </div>
    </div>
  </UiCard>
</template>
