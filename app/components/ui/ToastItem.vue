<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ fechar: [] }>()

const VISUAL = {
  sucesso: { icone: 'check', cor: 'bg-status-aprovada text-white', barra: 'bg-status-aprovada' },
  erro: { icone: 'alerta', cor: 'bg-status-rejeitada text-white', barra: 'bg-status-rejeitada' },
  info: { icone: 'info', cor: 'bg-fg text-bg', barra: 'bg-fg' },
  whatsapp: { icone: 'enviar', cor: 'bg-whatsapp text-[#0b3d1f]', barra: 'bg-whatsapp' }
} as const
const visual = computed(() => VISUAL[props.toast.tipo])

// Temporizador com pausa ao passar o mouse / arrastar
const pausado = ref(false)
let restante = props.toast.duracao
let inicio = 0
let timer: ReturnType<typeof setTimeout> | undefined

function iniciar() {
  inicio = Date.now()
  timer = setTimeout(() => emit('fechar'), restante)
}
function pausar() {
  if (pausado.value) return
  pausado.value = true
  clearTimeout(timer)
  restante -= Date.now() - inicio
}
function retomar() {
  if (!pausado.value) return
  pausado.value = false
  iniciar()
}
onMounted(iniciar)
onBeforeUnmount(() => clearTimeout(timer))

// Arrastar para o lado para dispensar
const dx = ref(0)
const arrastando = ref(false)
let x0 = 0
function aoTocar(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  arrastando.value = true
  x0 = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pausar()
}
function aoMover(e: PointerEvent) {
  if (arrastando.value) dx.value = e.clientX - x0
}
function aoSoltar() {
  if (!arrastando.value) return
  arrastando.value = false
  if (Math.abs(dx.value) > 90) {
    dx.value = Math.sign(dx.value) * 500
    setTimeout(() => emit('fechar'), 180)
  } else {
    dx.value = 0
    retomar()
  }
}

function clicarAcao() {
  props.toast.acao?.aoClicar()
  emit('fechar')
}
</script>

<template>
  <div
    role="status"
    class="pointer-events-auto relative flex w-full touch-pan-y select-none items-start gap-3 overflow-hidden rounded-lg
           border border-line bg-elevated p-4 pr-10 shadow-pop"
    :class="!arrastando && 'transition-[transform,opacity] duration-300 ease-out'"
    :style="{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, opacity: 1 - Math.min(Math.abs(dx) / 300, .9) }"
    @mouseenter="pausar"
    @mouseleave="retomar"
    @pointerdown="aoTocar"
    @pointermove="aoMover"
    @pointerup="aoSoltar"
    @pointercancel="aoSoltar"
  >
    <span class="mt-0.5 flex size-7 animate-pop items-center justify-center rounded-full" :class="visual.cor">
      <UiIcone :nome="visual.icone" :tamanho="16" :traco="2.5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="font-semibold">{{ toast.titulo }}</p>
      <p v-if="toast.descricao" class="mt-0.5 text-label text-muted">{{ toast.descricao }}</p>
      <button
        v-if="toast.acao"
        type="button"
        class="mt-2 text-label font-semibold underline decoration-line underline-offset-4 transition-colors hover:decoration-fg"
        @click="clicarAcao"
      >
        {{ toast.acao.rotulo }}
      </button>
    </div>
    <button
      type="button"
      aria-label="Fechar"
      class="absolute right-2 top-2 rounded p-1.5 text-muted transition-colors hover:bg-surface hover:text-fg"
      @click="emit('fechar')"
    >
      <UiIcone nome="x" :tamanho="16" />
    </button>
    <span
      class="barra absolute bottom-0 left-0 h-[3px] w-full origin-left opacity-60"
      :class="visual.barra"
      :style="{ animationDuration: `${toast.duracao}ms`, animationPlayState: pausado ? 'paused' : 'running' }"
    />
  </div>
</template>

<style scoped>
.barra { animation: esvaziar linear forwards; }
@keyframes esvaziar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
</style>
