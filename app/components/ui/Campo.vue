<script setup lang="ts">
const props = defineProps<{
  rotulo: string
  erro?: string
  dica?: string
  type?: string
  inputmode?: 'text' | 'url' | 'numeric' | 'email' | 'tel'
  autocomplete?: string
  maxlength?: number
  // Formata enquanto digita/cola (ex.: telefone). Aplicado no próprio input para o que
  // aparece na tela nunca divergir do valor (formatar num watch no pai deixava sobrar
  // caractere quando o valor formatado não mudava).
  formatar?: (valor: string) => string
}>()

const modelo = defineModel<string>({ default: '' })
const id = useId()

function aoDigitar(e: Event) {
  const el = e.target as HTMLInputElement
  const valor = props.formatar ? props.formatar(el.value) : el.value
  if (el.value !== valor) el.value = valor
  modelo.value = valor
}

// Balança o campo sempre que um novo erro aparece
const tremendo = ref(false)
watch(() => props.erro, (novo) => {
  if (!novo) return
  tremendo.value = false
  requestAnimationFrame(() => (tremendo.value = true))
})
</script>

<template>
  <div>
    <div
      class="campo relative rounded border bg-surface transition-[border-color,box-shadow] duration-200"
      :class="[
        erro ? 'border-status-rejeitada shadow-[0_0_0_4px_rgb(var(--status-rejeitada)/.12)]'
          : 'border-line focus-within:border-fg/50 focus-within:shadow-[0_0_0_4px_rgb(var(--ml-blue)/.15)]',
        tremendo && 'animate-shake'
      ]"
      @animationend="tremendo = false"
    >
      <input
        :id="id"
        :value="modelo"
        :type="type ?? 'text'"
        :inputmode="inputmode"
        placeholder=" "
        :autocomplete="autocomplete ?? 'off'"
        :maxlength="maxlength"
        :aria-invalid="!!erro || undefined"
        @input="aoDigitar"
        :aria-describedby="erro || dica ? `${id}-msg` : undefined"
        class="peer h-14 w-full bg-transparent px-4 pb-1.5 pt-5 text-body text-fg outline-none"
        :class="$slots.fim && 'pr-12'"
      >
      <label
        :for="id"
        class="pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-body text-muted
               transition-all duration-200 ease-out
               peer-focus:top-[18px] peer-focus:scale-[.8] peer-focus:text-fg
               peer-[:not(:placeholder-shown)]:top-[18px] peer-[:not(:placeholder-shown)]:scale-[.8]"
      >{{ rotulo }}</label>
      <div v-if="$slots.fim" class="absolute right-3 top-1/2 -translate-y-1/2">
        <slot name="fim" />
      </div>
    </div>
    <Transition name="msg" mode="out-in">
      <p v-if="erro" :id="`${id}-msg`" key="e" class="mt-2 flex items-center gap-1.5 text-label text-status-rejeitada">
        <UiIcone nome="alerta" :tamanho="16" /> {{ erro }}
      </p>
      <p v-else-if="dica" :id="`${id}-msg`" key="d" class="mt-2 text-label text-muted">{{ dica }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.msg-enter-active, .msg-leave-active { transition: opacity .2s ease, transform .2s ease; }
.msg-enter-from, .msg-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
