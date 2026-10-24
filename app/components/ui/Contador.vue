<script setup lang="ts">
// Número que "sobe" até o valor quando aparece na tela
const props = withDefaults(defineProps<{ valor: number, duracao?: number, sufixo?: string }>(), {
  duracao: 1200,
  sufixo: ''
})

const exibido = ref(0)
const el = ref<HTMLElement>()
let quadro = 0

function animar(de: number, ate: number) {
  cancelAnimationFrame(quadro)
  const t0 = performance.now()
  const passo = (t: number) => {
    const p = Math.min((t - t0) / props.duracao, 1)
    exibido.value = Math.round(de + (ate - de) * (1 - Math.pow(1 - p, 4)))
    if (p < 1) quadro = requestAnimationFrame(passo)
  }
  quadro = requestAnimationFrame(passo)
}

onMounted(() => {
  const obs = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) {
      animar(0, props.valor)
      obs.disconnect()
    }
  })
  if (el.value) obs.observe(el.value)
})
watch(() => props.valor, (novo, antigo) => animar(antigo, novo))
onBeforeUnmount(() => cancelAnimationFrame(quadro))
</script>

<template>
  <span ref="el" class="tabular-nums">{{ exibido.toLocaleString('pt-BR') }}{{ sufixo }}</span>
</template>
