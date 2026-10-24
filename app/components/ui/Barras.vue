<script setup lang="ts">
// Barras horizontais de uma série só (magnitude): cor neutra, sem legenda,
// valor na ponta, ponta arredondada (4px) e base reta, balão no hover/foco.
const props = withDefaults(defineProps<{
  itens: { chave: string, rotulo: string, valor: number }[]
  unidade?: string // "cliques"
}>(), { unidade: '' })

const maximo = computed(() => Math.max(1, ...props.itens.map(i => i.valor)))
const total = computed(() => props.itens.reduce((s, i) => s + i.valor, 0) || 1)
const pct = (v: number) => Math.round((v / total.value) * 100)

// Cresce a partir do zero quando aparece
const montado = ref(false)
onMounted(() => requestAnimationFrame(() => (montado.value = true)))
const ativo = ref<string | null>(null)
</script>

<template>
  <ul class="flex flex-col gap-3" @mouseleave="ativo = null">
    <li
      v-for="i in itens"
      :key="i.chave"
      tabindex="0"
      class="group relative -mx-2 cursor-default rounded px-2 py-1 outline-none transition-opacity duration-200 focus-visible:bg-surface"
      :class="ativo && ativo !== i.chave && 'opacity-40'"
      @mouseenter="ativo = i.chave"
      @focus="ativo = i.chave"
      @blur="ativo = null"
    >
      <div class="mb-1 text-label">{{ i.rotulo }}</div>
      <div class="flex items-center gap-2">
        <span
          class="h-2.5 shrink-0 rounded-r-[4px] bg-fg transition-[width] duration-700 ease-out"
          :style="{ width: montado ? `calc((100% - 64px) * ${i.valor / maximo})` : '0px', minWidth: i.valor ? '2px' : '0' }"
        />
        <span class="text-label font-semibold tabular-nums">{{ i.valor.toLocaleString('pt-BR') }}</span>
      </div>
      <!-- Balão -->
      <span
        v-if="ativo === i.chave"
        role="tooltip"
        class="pointer-events-none absolute -top-8 right-2 z-10 whitespace-nowrap rounded bg-fg px-2 py-1 text-[12px] text-bg shadow-pop"
      >
        {{ i.valor.toLocaleString('pt-BR') }} {{ unidade }} · {{ pct(i.valor) }}% do total
      </span>
    </li>
  </ul>
</template>
