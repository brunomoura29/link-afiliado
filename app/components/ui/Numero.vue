<script setup lang="ts">
// Número com botões − e + grandes (bom para o polegar).
const props = withDefaults(defineProps<{
  rotulo: string
  min?: number
  max?: number
  passo?: number
  sufixo?: string
}>(), { min: 0, max: 999, passo: 1, sufixo: '' })

const valor = defineModel<number>({ required: true })
const pulso = ref(0) // re-anima o número a cada mudança

function mudar(delta: number) {
  const novo = Math.min(props.max, Math.max(props.min, valor.value + delta))
  if (novo === valor.value) return
  valor.value = novo
  pulso.value++
}
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <span class="text-label">{{ rotulo }}</span>
    <div class="flex shrink-0 items-center rounded-full border border-line bg-surface p-1">
      <button
        type="button"
        :aria-label="`Diminuir ${rotulo}`"
        class="flex size-10 items-center justify-center rounded-full text-[20px] transition-[transform,background-color] active:scale-90 enabled:hover:bg-elevated disabled:opacity-30"
        :disabled="valor <= min"
        @click="mudar(-passo)"
      >−</button>
      <span class="min-w-[72px] text-center font-semibold tabular-nums" aria-live="polite">
        <span :key="pulso" class="inline-block animate-pop">{{ valor }}</span>
        <span v-if="sufixo" class="ml-1 text-label font-normal text-muted">{{ sufixo }}</span>
      </span>
      <button
        type="button"
        :aria-label="`Aumentar ${rotulo}`"
        class="flex size-10 items-center justify-center rounded-full text-[20px] transition-[transform,background-color] active:scale-90 enabled:hover:bg-elevated disabled:opacity-30"
        :disabled="valor >= max"
        @click="mudar(passo)"
      >+</button>
    </div>
  </div>
</template>
