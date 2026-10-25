<script setup lang="ts">
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'

// `status` só aparece no painel; nas páginas públicas fica sem.
// preco null = a loja não mostra o preço (ex.: Shopee) → "Preço no link".
const props = defineProps<{
  titulo: string
  plataforma: Plataforma
  preco: number | null
  original: number | null
  imagem?: string | null
  descontoRotulo?: string | null
  categoria?: string
  status?: StatusPostagem
  matiz: number
  compacto?: boolean
}>()

const desconto = computed(() => Number(props.descontoRotulo?.match(/\d+/)?.[0])
  || (props.preco != null && props.original ? Math.round((1 - props.preco / props.original) * 100) : null))
</script>

<template>
  <UiCard interativo class="group overflow-hidden">
    <div
      class="relative flex items-center justify-center overflow-hidden"
      :class="compacto ? 'aspect-square' : 'aspect-[4/3]'"
      :style="{ background: `linear-gradient(135deg, hsl(${matiz} 70% 92%), hsl(${matiz + 40} 70% 82%))` }"
    >
      <img
        v-if="imagem"
        :src="imagem"
        :alt="titulo"
        loading="lazy"
        class="size-full bg-white object-contain transition-transform duration-500 ease-spring group-hover:scale-105"
      >
      <UiIcone
        v-else
        nome="sacola"
        :tamanho="compacto ? 40 : 56"
        :traco="1.5"
        class="text-black/25 transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110"
      />
      <div class="absolute left-2 top-2" :class="!compacto && 'left-3 top-3'">
        <UiBadgePlataforma :plataforma="plataforma" />
      </div>
      <span
        v-if="desconto"
        class="absolute rounded-full bg-fg px-2.5 py-1 text-label font-semibold text-bg"
        :class="compacto ? 'bottom-2 right-2' : 'right-3 top-3'"
      >
        -{{ desconto }}%
      </span>
    </div>
    <div class="flex flex-col gap-2 p-3" :class="!compacto && 'gap-3 p-4'">
      <p class="line-clamp-2" :class="compacto ? 'min-h-10 text-label' : 'min-h-12'">{{ titulo }}</p>
      <div v-if="preco != null" class="flex flex-wrap items-baseline gap-x-2">
        <span :class="compacto ? 'font-semibold' : 'text-title'">{{ formatarPreco(preco) }}</span>
        <span v-if="original" class="text-label text-muted line-through">{{ formatarPreco(original) }}</span>
      </div>
      <p v-else class="text-label text-muted">Preço no link</p>
      <div v-if="categoria || status" class="flex items-center justify-between">
        <span class="text-label text-muted">{{ categoria }}</span>
        <UiStatus v-if="status" :status="status" />
      </div>
    </div>
  </UiCard>
</template>
