<script setup lang="ts">
// Prévia da conexão por QR code (o QR aqui é decorativo, gerado aleatoriamente).
const toast = useToast()
const estado = ref<'aguardando' | 'conectando' | 'conectado'>('aguardando')

const N = 25
const modulos = ref<boolean[]>([])
function novoQr() {
  modulos.value = Array.from({ length: N * N }, () => Math.random() > .52)
}
onMounted(novoQr)

const naQuina = (i: number) => {
  const x = i % N, y = Math.floor(i / N)
  const dentro = (a: number, b: number) => a < 7 && b < 7
  return dentro(x, y) || dentro(N - 1 - x, y) || dentro(x, N - 1 - y)
}

async function simular() {
  estado.value = 'conectando'
  await new Promise(r => setTimeout(r, 1400))
  estado.value = 'conectado'
  toast.sucesso('WhatsApp conectado', '+55 11 9•••• 4821 pronto para enviar.')
}
function desconectar() {
  estado.value = 'aguardando'
  novoQr()
  toast.info('WhatsApp desconectado')
}
</script>

<template>
  <UiCard class="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
    <div class="relative size-48 shrink-0 overflow-hidden rounded-lg border border-line bg-white p-3">
      <div
        class="grid size-full transition-[filter,opacity] duration-500"
        :class="estado === 'conectado' && 'opacity-30 blur-[3px]'"
        :style="{ gridTemplateColumns: `repeat(${N}, 1fr)` }"
      >
        <span v-for="(m, i) in modulos" :key="i" :class="(m && !naQuina(i)) ? 'bg-[#0d0d0d]' : ''" />
      </div>
      <!-- Quinas do QR -->
      <template v-if="estado !== 'conectado'">
        <span
          v-for="pos in ['left-3 top-3', 'right-3 top-3', 'left-3 bottom-3']"
          :key="pos"
          class="absolute size-[47px] rounded-[6px] border-[7px] border-[#0d0d0d] p-[5px]" :class="pos"
        >
          <span class="block size-full rounded-[3px] bg-[#0d0d0d]" />
        </span>
      </template>
      <span
        v-if="estado !== 'conectado'"
        class="absolute inset-x-2 h-0.5 animate-scan rounded-full bg-whatsapp shadow-[0_0_12px_2px_rgb(var(--whatsapp)/.7)]"
      />
      <Transition name="conectado">
        <div v-if="estado === 'conectado'" class="absolute inset-0 flex items-center justify-center">
          <span class="absolute size-16 animate-ring-out rounded-full bg-whatsapp/40" />
          <span class="relative flex size-16 items-center justify-center rounded-full bg-whatsapp text-[#0b3d1f] shadow-pop">
            <UiCheckAnimado :tamanho="30" />
          </span>
        </div>
      </Transition>
    </div>

    <div class="flex w-full flex-col gap-3 text-center sm:text-left">
      <div class="flex justify-center sm:justify-start">
        <span
          class="inline-flex h-7 items-center gap-2 rounded-full px-3 text-label font-semibold transition-colors duration-300"
          :class="estado === 'conectado' ? 'bg-whatsapp/15 text-fg' : 'bg-surface text-muted'"
        >
          <span class="relative flex size-2">
            <span class="absolute inset-0 animate-ring-out rounded-full" :class="estado === 'conectado' ? 'bg-whatsapp' : 'bg-status-pendente'" />
            <span class="relative size-2 rounded-full" :class="estado === 'conectado' ? 'bg-whatsapp' : 'bg-status-pendente'" />
          </span>
          {{ { aguardando: 'Aguardando leitura', conectando: 'Conectando…', conectado: 'Conectado' }[estado] }}
        </span>
      </div>
      <p class="font-semibold">Conecte seu WhatsApp</p>
      <p class="text-label text-muted">
        No celular, abra o WhatsApp › Aparelhos conectados › Conectar aparelho e aponte para o código.
        Use um número dedicado, não o principal.
      </p>
      <div class="flex justify-center gap-2 sm:justify-start">
        <UiBotao v-if="estado !== 'conectado'" tamanho="sm" :carregando="estado === 'conectando'" @click="simular">
          <UiIcone nome="celular" :tamanho="16" /> Simular leitura
          <template #carregando>Conectando…</template>
        </UiBotao>
        <UiBotao v-else tamanho="sm" variante="secundario" @click="desconectar">Desconectar</UiBotao>
        <UiBotao v-if="estado === 'aguardando'" tamanho="sm" variante="fantasma" @click="novoQr">
          <UiIcone nome="atualizar" :tamanho="16" /> Novo código
        </UiBotao>
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
.conectado-enter-active { transition: opacity .3s ease, transform .5s cubic-bezier(.34, 1.56, .64, 1); }
.conectado-enter-from { opacity: 0; transform: scale(.5); }
</style>
