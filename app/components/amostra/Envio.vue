<script setup lang="ts">
// Simula a fila: um grupo por vez, com intervalo aleatório entre envios.
const toast = useToast()

type Etapa = 'aguardando' | 'enviando' | 'enviado'
const grupos = ref<{ nome: string, membros: number, etapa: Etapa }[]>([
  { nome: 'Achadinhos Casa 🏠', membros: 512, etapa: 'aguardando' },
  { nome: 'Promo Cozinha VIP', membros: 238, etapa: 'aguardando' },
  { nome: 'Ofertas do Dia', membros: 1024, etapa: 'aguardando' }
])
const rodando = ref(false)
const enviados = computed(() => grupos.value.filter(g => g.etapa === 'enviado').length)
const progresso = computed(() => (enviados.value / grupos.value.length) * 100)

async function simular() {
  rodando.value = true
  grupos.value.forEach(g => (g.etapa = 'aguardando'))
  for (const g of grupos.value) {
    await new Promise(r => setTimeout(r, 500 + Math.random() * 700))
    g.etapa = 'enviando'
    await new Promise(r => setTimeout(r, 900))
    g.etapa = 'enviado'
  }
  rodando.value = false
  toast.whatsapp('Oferta enviada', `Publicada em ${grupos.value.length} grupos de Casa e Cozinha.`)
}
</script>

<template>
  <UiCard class="p-5">
    <div class="mb-1 flex items-center justify-between">
      <p class="font-semibold">Fila de envio</p>
      <p class="text-label tabular-nums text-muted">{{ enviados }}/{{ grupos.length }}</p>
    </div>
    <div class="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
      <div class="h-full rounded-full bg-whatsapp transition-[width] duration-700 ease-out" :style="{ width: `${progresso}%` }" />
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="g in grupos"
        :key="g.nome"
        class="flex items-center gap-3 rounded border p-3 transition-colors duration-300"
        :class="g.etapa === 'enviando' ? 'border-whatsapp/60 bg-whatsapp/5' : 'border-line'"
      >
        <span class="flex size-9 items-center justify-center rounded-full bg-surface text-muted">
          <UiIcone nome="usuarios" :tamanho="18" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate">{{ g.nome }}</span>
          <span class="block text-label text-muted">{{ g.membros }} membros</span>
        </span>
        <span class="flex w-24 justify-end">
          <Transition name="etapa" mode="out-in">
            <span v-if="g.etapa === 'aguardando'" key="a" class="flex items-center gap-1.5 text-label text-muted">
              <UiIcone nome="relogio" :tamanho="15" /> Na fila
            </span>
            <span v-else-if="g.etapa === 'enviando'" key="e" class="voando flex items-center gap-1.5 text-label font-semibold">
              <UiIcone nome="enviar" :tamanho="15" /> Enviando
            </span>
            <span v-else key="ok" class="flex size-7 animate-pop items-center justify-center rounded-full bg-whatsapp text-[#0b3d1f]">
              <UiCheckAnimado :tamanho="15" />
            </span>
          </Transition>
        </span>
      </li>
    </ul>

    <UiBotao class="mt-4" variante="whatsapp" bloco :carregando="rodando" @click="simular">
      <UiIcone nome="enviar" :tamanho="18" /> Simular envio
      <template #carregando>Enviando com intervalo…</template>
    </UiBotao>
  </UiCard>
</template>

<style scoped>
.voando :deep(svg) { animation: voar .9s ease-in-out infinite; }
@keyframes voar {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(3px, -3px); }
}
.etapa-enter-active { transition: opacity .2s ease, transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.etapa-leave-active { transition: opacity .15s ease, transform .15s ease; }
.etapa-enter-from { opacity: 0; transform: translateY(6px); }
.etapa-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
