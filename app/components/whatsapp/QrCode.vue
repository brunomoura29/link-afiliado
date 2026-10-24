<script setup lang="ts">
// Mostra o QR da UazAPI (`imagem`, base64/URL). Sem imagem, desenha um QR
// decorativo a partir da `semente` (só para a prévia).
const props = defineProps<{ imagem?: string, semente: number, lido?: boolean }>()

const N = 25
const modulos = computed(() => {
  let s = Math.floor(props.semente * 1e9) || 1
  const aleatorio = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: N * N }, () => aleatorio() > .52)
})
const naQuina = (i: number) => {
  const x = i % N, y = Math.floor(i / N)
  const dentro = (a: number, b: number) => a < 7 && b < 7
  return dentro(x, y) || dentro(N - 1 - x, y) || dentro(x, N - 1 - y)
}
</script>

<template>
  <div class="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-white p-3">
    <Transition name="qr" mode="out-in">
      <img v-if="imagem" :key="imagem" :src="imagem" alt="QR code para conectar o WhatsApp" class="size-full" :class="lido && 'opacity-30 blur-[3px]'">
      <div v-else :key="semente" class="relative size-full transition-[filter,opacity] duration-500" :class="lido && 'opacity-30 blur-[3px]'">
        <div class="grid size-full" :style="{ gridTemplateColumns: `repeat(${N}, 1fr)` }">
          <span v-for="(m, i) in modulos" :key="i" :class="(m && !naQuina(i)) ? 'bg-[#0d0d0d]' : ''" />
        </div>
        <span
          v-for="pos in ['left-0 top-0', 'right-0 top-0', 'left-0 bottom-0']"
          :key="pos"
          class="absolute size-[28%] rounded-[6px] border-[6px] border-[#0d0d0d] p-[4px]"
          :class="pos"
        >
          <span class="block size-full rounded-[3px] bg-[#0d0d0d]" />
        </span>
      </div>
    </Transition>
    <span
      v-if="!lido"
      class="absolute inset-x-2 h-0.5 animate-scan rounded-full bg-whatsapp shadow-[0_0_12px_2px_rgb(var(--whatsapp)/.7)]"
    />
    <slot />
  </div>
</template>

<style scoped>
.qr-enter-active { transition: opacity .3s ease, transform .4s cubic-bezier(.34, 1.56, .64, 1); }
.qr-leave-active { transition: opacity .15s ease; }
.qr-enter-from { opacity: 0; transform: scale(.9); }
.qr-leave-to { opacity: 0; }
</style>
