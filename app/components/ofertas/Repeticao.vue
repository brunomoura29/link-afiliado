<script setup lang="ts">
// Campos da repetição automática (padrão da categoria ou de uma oferta):
// ligar/desligar, de quantos em quantos dias e até quantas vezes.
export interface ConfigRepeticao {
  aCadaDias: number | null // null = não repete
  max: number // 1 a 10
}

defineProps<{ descricao?: string, disabled?: boolean }>()
const modelo = defineModel<ConfigRepeticao>({ required: true })

const PERIODOS = [2, 3, 7, 15, 30]
const opcoesPeriodo = PERIODOS.map(d => ({ valor: String(d), rotulo: `A cada ${d} dias` }))
const opcoesMax = Array.from({ length: 10 }, (_, i) => ({ valor: String(i + 1), rotulo: i ? `Até ${i + 1} vezes` : 'Só 1 vez' }))

const ligado = computed({
  get: () => modelo.value.aCadaDias !== null,
  set: (v: boolean) => (modelo.value = { ...modelo.value, aCadaDias: v ? 7 : null })
})
const periodo = computed({
  get: () => String(modelo.value.aCadaDias ?? 7),
  set: (v: string) => (modelo.value = { ...modelo.value, aCadaDias: Number(v) })
})
const max = computed({
  get: () => String(modelo.value.max),
  set: (v: string) => (modelo.value = { ...modelo.value, max: Number(v) })
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiInterruptor
      v-model="ligado"
      :disabled="disabled"
      rotulo="Repetir automaticamente"
      :descricao="descricao ?? 'Manda de novo depois de alguns dias, com o preço lido de novo. Pausa sozinha se o preço subir ou o produto sumir.'"
    />
    <div v-if="ligado" class="grid gap-3 sm:grid-cols-2">
      <UiSelecao v-model="periodo" rotulo="Periodicidade" :opcoes="opcoesPeriodo" />
      <UiSelecao v-model="max" rotulo="Quantas repetições" :opcoes="opcoesMax" />
    </div>
  </div>
</template>
