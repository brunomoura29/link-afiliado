<script setup lang="ts">
const props = withDefaults(defineProps<{
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'whatsapp'
  tamanho?: 'sm' | 'md' | 'lg'
  carregando?: boolean
  sucesso?: boolean
  bloco?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), {
  variante: 'primario',
  tamanho: 'md',
  type: 'button'
})

const VARIANTES = {
  primario: 'bg-fg text-bg hover:bg-fg/90',
  secundario: 'bg-surface text-fg border border-line hover:border-fg/30',
  fantasma: 'text-fg hover:bg-surface',
  perigo: 'bg-status-rejeitada text-white hover:bg-status-rejeitada/90',
  whatsapp: 'bg-whatsapp text-[#0b3d1f] hover:bg-whatsapp/90'
}
const TAMANHOS = {
  sm: 'h-9 px-3 text-label',
  md: 'h-12 px-5 text-body',
  lg: 'h-14 px-6 text-body'
}

// Efeito "ripple" a partir do ponto tocado
const ondas = ref<{ id: number, x: number, y: number, d: number }[]>([])
let idOnda = 0
function aoPressionar(e: PointerEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const d = Math.max(r.width, r.height) * 2.2
  const id = ++idOnda
  ondas.value.push({ id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d })
  setTimeout(() => (ondas.value = ondas.value.filter(o => o.id !== id)), 650)
}

const travado = computed(() => props.disabled || props.carregando)
</script>

<template>
  <button
    :type="type"
    :disabled="travado"
    :aria-busy="carregando || undefined"
    class="relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded font-semibold
           transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-out
           active:scale-[.97] disabled:cursor-not-allowed"
    :class="[
      sucesso ? 'bg-status-aprovada text-white' : VARIANTES[variante],
      TAMANHOS[tamanho],
      bloco && 'w-full',
      disabled && !carregando && 'opacity-40'
    ]"
    @pointerdown="aoPressionar"
  >
    <span
      v-for="o in ondas"
      :key="o.id"
      class="onda pointer-events-none absolute rounded-full bg-current"
      :style="{ left: `${o.x}px`, top: `${o.y}px`, width: `${o.d}px`, height: `${o.d}px` }"
    />
    <Transition name="troca" mode="out-in">
      <span v-if="carregando" key="c" class="relative flex items-center gap-2">
        <UiSpinner />
        <slot name="carregando">Salvando…</slot>
      </span>
      <span v-else-if="sucesso" key="s" class="relative flex items-center gap-2">
        <UiCheckAnimado />
        <slot name="sucesso">Pronto!</slot>
      </span>
      <span v-else key="p" class="relative flex items-center gap-2">
        <slot />
      </span>
    </Transition>
  </button>
</template>

<style scoped>
.onda {
  opacity: .18;
  transform: scale(0);
  animation: onda .65s cubic-bezier(.22, 1, .36, 1) forwards;
}
@keyframes onda {
  to { transform: scale(1); opacity: 0; }
}
.troca-enter-active, .troca-leave-active {
  transition: opacity .18s ease, transform .25s cubic-bezier(.34, 1.56, .64, 1);
}
.troca-enter-from { opacity: 0; transform: translateY(8px) scale(.9); }
.troca-leave-to { opacity: 0; transform: translateY(-8px) scale(.9); }
</style>
