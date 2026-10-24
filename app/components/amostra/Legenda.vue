<script setup lang="ts">
// A IA escreve o texto, mas preço e desconto entram "travados" (vêm da página do produto).
const fixos = { preco: 129.9, original: 199.9, desconto: 35, link: 'https://meli.la/2xYp8Qa' }

const ABERTURAS = [
  '🔥 Achado do dia!',
  'Olha esse preço 👀',
  'Corre que tá barato!',
  'Promoção relâmpago ⚡'
]

const estado = ref<'parado' | 'pensando' | 'escrevendo' | 'pronto'>('parado')
const texto = ref('')
let rodada = 0

async function gerar() {
  if (estado.value === 'pensando' || estado.value === 'escrevendo') return
  texto.value = ''
  estado.value = 'pensando'
  await new Promise(r => setTimeout(r, 1100))

  const abertura = ABERTURAS[rodada++ % ABERTURAS.length]
  const final = `${abertura} Fone Bluetooth com cancelamento de ruído de ${formatarPreco(fixos.original)} por ${formatarPreco(fixos.preco)} (${fixos.desconto}% OFF). Bateria pra semana toda 🎧\n\n👉 ${fixos.link}`

  estado.value = 'escrevendo'
  for (const ch of final) {
    texto.value += ch
    await new Promise(r => setTimeout(r, ch === ' ' ? 8 : 16))
  }
  estado.value = 'pronto'
}
</script>

<template>
  <UiCard class="p-5">
    <div class="mb-4 flex flex-wrap gap-2">
      <span
        v-for="(valor, rotulo) in { 'Preço': formatarPreco(fixos.preco), 'De': formatarPreco(fixos.original), 'Desconto': `${fixos.desconto}%` }"
        :key="rotulo"
        class="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-label"
      >
        <UiIcone nome="cadeado" :tamanho="13" class="text-muted" />
        <span class="text-muted">{{ rotulo }}</span>
        <span class="font-semibold">{{ valor }}</span>
      </span>
    </div>

    <div class="relative min-h-[148px] whitespace-pre-line rounded border border-line bg-surface p-4">
      <Transition name="fade" mode="out-in">
        <div v-if="estado === 'parado'" key="p" class="flex h-[116px] items-center justify-center text-muted">
          A legenda aparece aqui.
        </div>
        <div v-else-if="estado === 'pensando'" key="t" class="flex h-[116px] items-center justify-center gap-2 text-muted">
          <UiIcone nome="brilho" :tamanho="18" class="animate-pulse" />
          IA pensando
          <span class="flex gap-1">
            <span v-for="i in 3" :key="i" class="size-1.5 animate-bounce3 rounded-full bg-muted" :style="{ animationDelay: `${i * 150}ms` }" />
          </span>
        </div>
        <p v-else key="e">
          {{ texto }}<span v-if="estado === 'escrevendo'" class="ml-0.5 inline-block h-5 w-[2px] translate-y-1 animate-blink bg-fg" />
        </p>
      </Transition>
    </div>

    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-label text-muted">Cada geração muda a abertura.</p>
      <UiBotao variante="secundario" tamanho="sm" :disabled="estado === 'pensando' || estado === 'escrevendo'" @click="gerar">
        <UiIcone nome="brilho" :tamanho="16" />
        {{ estado === 'pronto' ? 'Gerar outra' : 'Gerar legenda' }}
      </UiBotao>
    </div>
  </UiCard>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
