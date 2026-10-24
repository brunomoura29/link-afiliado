<script setup lang="ts">
const props = defineProps<{
  rotulo?: string
  erro?: string
  nova?: boolean // cadastro: mostra a força da senha e usa autocomplete de nova senha
}>()

const senha = defineModel<string>({ default: '' })
const visivel = ref(false)

const forca = computed(() => forcaSenha(senha.value))
const NIVEIS = [
  { rotulo: '', cor: '' },
  { rotulo: 'Fraca', cor: 'bg-status-rejeitada' },
  { rotulo: 'Média', cor: 'bg-muted' },
  { rotulo: 'Boa', cor: 'bg-status-aprovada' },
  { rotulo: 'Forte', cor: 'bg-status-aprovada' }
]
const dica = computed(() => props.nova && !senha.value ? 'Use pelo menos 8 caracteres, com números.' : undefined)
</script>

<template>
  <div>
    <UiCampo
      v-model="senha"
      :rotulo="rotulo ?? 'Senha'"
      :type="visivel ? 'text' : 'password'"
      :autocomplete="nova ? 'new-password' : 'current-password'"
      :erro="erro"
      :dica="dica"
    >
      <template #fim>
        <button
          type="button"
          :aria-label="visivel ? 'Esconder senha' : 'Mostrar senha'"
          class="flex size-9 items-center justify-center rounded text-muted transition-colors hover:text-fg"
          @click="visivel = !visivel"
        >
          <Transition name="olho" mode="out-in">
            <UiIcone v-if="visivel" key="a" nome="olho-fechado" :tamanho="18" />
            <UiIcone v-else key="f" nome="olho" :tamanho="18" />
          </Transition>
        </button>
      </template>
    </UiCampo>

    <div v-if="nova && senha && !erro" class="mt-2 flex items-center gap-3">
      <div class="flex flex-1 gap-1">
        <span v-for="i in 4" :key="i" class="h-1 flex-1 overflow-hidden rounded-full bg-line">
          <span
            class="block h-full origin-left rounded-full transition-transform duration-500 ease-spring"
            :class="NIVEIS[forca]!.cor"
            :style="{ transform: `scaleX(${i <= forca ? 1 : 0})` }"
          />
        </span>
      </div>
      <span class="w-10 text-right text-label text-muted">{{ NIVEIS[forca]!.rotulo }}</span>
    </div>
  </div>
</template>

<style scoped>
.olho-enter-active, .olho-leave-active { transition: opacity .15s ease, transform .2s ease; }
.olho-enter-from, .olho-leave-to { opacity: 0; transform: scale(.7); }
</style>
