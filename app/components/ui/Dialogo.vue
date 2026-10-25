<script setup lang="ts">
// Gaveta de baixo no celular, janela centralizada a partir de sm.
// "ampla": cresce em telas grandes (lg), para conteúdo em duas colunas.
withDefaults(defineProps<{ titulo: string, descricao?: string, largura?: 'padrao' | 'larga' | 'ampla' }>(), { largura: 'padrao' })
const aberto = defineModel<boolean>({ default: false })

const fecharComEsc = (e: KeyboardEvent) => e.key === 'Escape' && (aberto.value = false)
onMounted(() => window.addEventListener('keydown', fecharComEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', fecharComEsc))
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="fundo">
      <div v-if="aberto" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" @click="aberto = false" />
    </Transition>
    <div class="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <Transition name="dialogo">
        <div
          v-if="aberto"
          role="dialog"
          aria-modal="true"
          :aria-label="titulo"
          class="pointer-events-auto w-full rounded-t-[20px] border border-line bg-elevated px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-pop
                 sm:rounded-lg sm:p-6"
          :class="{ padrao: 'sm:max-w-sm', larga: 'sm:max-w-xl', ampla: 'sm:max-w-xl lg:max-w-4xl' }[largura]"
        >
          <span class="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <slot name="icone" />
          <h2 class="text-title">{{ titulo }}</h2>
          <p v-if="descricao" class="mt-1 text-muted">{{ descricao }}</p>
          <!-- Margem negativa + padding: afasta a barra de rolagem dos campos sem desalinhar
               do título, e deixa espaço para o brilho de foco não ser cortado -->
          <div
            v-if="$slots.default"
            class="-ml-1 -mr-3 mt-4 max-h-[60dvh] overflow-y-auto py-1 pl-1 pr-3 [scrollbar-width:thin] sm:-mr-5 sm:pr-5"
            :class="largura === 'ampla' && 'lg:max-h-[72dvh]'"
          >
            <slot />
          </div>
          <div v-if="$slots.acoes" class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <slot name="acoes" />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.fundo-enter-active, .fundo-leave-active { transition: opacity .25s ease; }
.fundo-enter-from, .fundo-leave-to { opacity: 0; }

.dialogo-enter-active { transition: transform .45s cubic-bezier(.22, 1, .36, 1), opacity .25s ease; }
.dialogo-leave-active { transition: transform .2s ease-in, opacity .2s ease; }
.dialogo-enter-from, .dialogo-leave-to { transform: translateY(100%); }
@media (min-width: 640px) {
  .dialogo-enter-active { transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .2s ease; }
  .dialogo-enter-from, .dialogo-leave-to { transform: scale(.94); opacity: 0; }
}
</style>
