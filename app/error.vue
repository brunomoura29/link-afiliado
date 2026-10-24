<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const naoEncontrada = computed(() => props.error.statusCode === 404)
useHead({ title: naoEncontrada.value ? 'Página não encontrada' : 'Algo deu errado' })
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <span class="mb-5 flex size-16 animate-pop items-center justify-center rounded-full bg-surface text-muted">
      <UiIcone :nome="naoEncontrada ? 'link' : 'alerta'" :tamanho="28" />
    </span>
    <p class="animate-fade-up text-label font-semibold text-muted">{{ error.statusCode }}</p>
    <h1 class="mt-1 animate-fade-up text-title [animation-delay:60ms]">
      {{ naoEncontrada ? 'Essa página não existe' : 'Algo deu errado' }}
    </h1>
    <p class="mt-2 max-w-xs animate-fade-up text-muted [animation-delay:120ms]">
      {{ naoEncontrada ? 'Confira o endereço ou volte para o início.' : 'Tente de novo em instantes.' }}
    </p>
    <div class="mt-6 animate-fade-up [animation-delay:180ms]">
      <UiBotao @click="clearError({ redirect: '/painel' })">Voltar para o início</UiBotao>
    </div>
  </div>
</template>
