<script setup lang="ts">
const props = defineProps<{
  rotulo: string
  opcoes: { valor: string, rotulo: string }[]
  placeholder?: string
  erro?: string
}>()

const modelo = defineModel<string>({ default: '' })
const id = useId()

// Balança sempre que um novo erro aparece (igual ao UiCampo)
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
      class="relative rounded border bg-surface transition-[border-color,box-shadow] duration-200"
      :class="[
        erro ? 'border-status-rejeitada shadow-[0_0_0_4px_rgb(var(--status-rejeitada)/.12)]'
          : 'border-line focus-within:border-fg/50 focus-within:shadow-[0_0_0_4px_rgb(var(--ml-blue)/.15)]',
        tremendo && 'animate-shake'
      ]"
      @animationend="tremendo = false"
    >
      <label :for="id" class="pointer-events-none absolute left-4 top-[9px] text-[12.8px] leading-4 text-muted">
        {{ rotulo }}
      </label>
      <select
        :id="id"
        v-model="modelo"
        :aria-invalid="!!erro || undefined"
        class="h-14 w-full cursor-pointer appearance-none bg-transparent px-4 pb-1.5 pt-5 pr-12 text-body outline-none"
        :class="modelo ? 'text-fg' : 'text-muted'"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="o in opcoes" :key="o.valor" :value="o.valor" class="text-fg">{{ o.rotulo }}</option>
      </select>
      <UiIcone
        nome="seta"
        :tamanho="18"
        class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
    <Transition name="msg">
      <p v-if="erro" class="mt-2 flex items-center gap-1.5 text-label text-status-rejeitada">
        <UiIcone nome="alerta" :tamanho="16" /> {{ erro }}
      </p>
    </Transition>
  </div>
</template>

<style scoped>
.msg-enter-active, .msg-leave-active { transition: opacity .2s ease, transform .2s ease; }
.msg-enter-from, .msg-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
