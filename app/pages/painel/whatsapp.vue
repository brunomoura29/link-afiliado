<script setup lang="ts">
import type { ModoConexao } from '~/composables/useWhatsapp'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'WhatsApp · LinkAfiliado' })

const toast = useToast()
const { disparar } = useConfete()
const { estado, gerar, renovar, simularLeitura, cancelar, desconectar } = useWhatsapp()

// Celular: código pelo número (o QR estaria na tela do próprio celular que precisa lê-lo).
// Computador: QR code.
const modo = ref<ModoConexao>('codigo')
onMounted(() => {
  if (matchMedia('(min-width: 1024px)').matches) modo.value = 'qr'
})

const vista = computed(() =>
  estado.value.status === 'conectado' ? 'conectado'
    : estado.value.status === 'desconectado' ? 'desconectado'
      : 'pareando'
)

// Número para o código de pareamento
const numero = ref('')
const erroNumero = ref('')
watch(numero, () => (erroNumero.value = ''))

async function iniciar() {
  if (modo.value === 'codigo' && !ehTelefone(numero.value)) {
    erroNumero.value = 'Informe o número com DDD'
    return
  }
  await gerar(modo.value, modo.value === 'codigo' ? `+55 ${numero.value}` : undefined)
}

// Contagem regressiva do código/QR
const agora = ref(Date.now())
let relogio: ReturnType<typeof setInterval> | undefined
onMounted(() => (relogio = setInterval(() => (agora.value = Date.now()), 250)))
onBeforeUnmount(() => clearInterval(relogio))

const VALIDADE = 45
const restante = computed(() => estado.value.expiraEm ? Math.max(0, Math.ceil((estado.value.expiraEm - agora.value) / 1000)) : 0)
const tempoTexto = computed(() => `0:${String(restante.value).padStart(2, '0')}`)
watch(restante, (r) => {
  if (r === 0 && estado.value.status === 'aguardando' && !renovar()) {
    toast.erro('O código expirou', 'Gere um novo quando estiver com o celular em mãos.')
  }
})

const botaoPrevia = ref<{ $el: HTMLElement }>()
async function conectarPrevia() {
  await simularLeitura()
  disparar(botaoPrevia.value?.$el ?? null, 36)
  toast.sucesso('WhatsApp conectado!', 'Agora é só escolher os grupos que vão receber as ofertas.')
}

const copiado = ref(false)
async function copiarCodigo() {
  try { await navigator.clipboard.writeText(estado.value.codigo.replace('-', '')) } catch {}
  copiado.value = true
  setTimeout(() => (copiado.value = false), 1500)
}

// Desconectar com confirmação
const confirmar = ref(false)
const desconectando = ref(false)
async function confirmarDesconexao() {
  desconectando.value = true
  await desconectar()
  desconectando.value = false
  confirmar.value = false
  toast.info('WhatsApp desconectado', 'Os envios ficam pausados até você conectar de novo.')
}

const conectadoHa = computed(() => {
  if (!estado.value.conectadoEm) return ''
  const dias = Math.floor((Date.now() - new Date(estado.value.conectadoEm).getTime()) / 86_400_000)
  return dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
})
const iniciais = computed(() => estado.value.nomePerfil.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase())

const PASSOS = computed(() => modo.value === 'codigo'
  ? [
      `Abra o WhatsApp no celular do número ${estado.value.numero}`,
      'Toque em ⋮ (Android) ou Configurações (iPhone) › Aparelhos conectados',
      'Toque em Conectar aparelho › Conectar com número de telefone',
      'Digite o código acima'
    ]
  : [
      'Abra o WhatsApp no celular',
      'Toque em ⋮ (Android) ou Configurações (iPhone) › Aparelhos conectados',
      'Toque em Conectar aparelho e aponte a câmera para o código'
    ])

const DICAS = [
  { icone: 'celular', titulo: 'Use um número só para isso', texto: 'Nunca o número principal do seu negócio.' },
  { icone: 'relogio', titulo: 'Comece devagar', texto: 'Número novo? Envie poucas ofertas nos primeiros dias.' },
  { icone: 'usuarios', titulo: 'Não adicione pessoas', texto: 'Deixe que entrem pelo link do grupo.' },
  { icone: 'cadeado', titulo: 'Mantenha o celular ligado', texto: 'De vez em quando, com internet, para a conexão não cair.' }
] as const

const MODOS = [
  { valor: 'codigo', rotulo: 'Código pelo número' },
  { valor: 'qr', rotulo: 'QR code' }
] as const
</script>

<template>
  <div class="flex flex-col gap-6">
    <header>
      <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">WhatsApp</h1>
      <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Conecte o número que vai enviar as ofertas nos grupos.</p>
    </header>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <UiCard class="animate-fade-up overflow-hidden p-5 [animation-delay:100ms] sm:p-6">
        <Transition name="estado" mode="out-in">
          <!-- Conectado -->
          <div v-if="vista === 'conectado'" key="conectado" class="flex flex-col gap-6">
            <div class="flex items-center gap-4">
              <span class="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-whatsapp text-[18px] font-semibold text-[#0b3d1f]">
                <span class="absolute inset-0 animate-ring-out rounded-full bg-whatsapp" />
                <span class="relative">{{ iniciais }}</span>
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold">{{ estado.nomePerfil }}</p>
                <p class="truncate text-muted">{{ estado.numero }}</p>
                <p class="mt-1 flex items-center gap-1.5 text-label">
                  <span class="size-2 rounded-full bg-whatsapp" />
                  <span class="font-semibold">Conectado</span>
                  <span class="text-muted">· {{ conectadoHa }}</span>
                </p>
              </div>
            </div>

            <div class="grid grid-cols-3 divide-x divide-line rounded border border-line bg-surface py-3 text-center">
              <div class="px-2">
                <p class="text-title"><UiContador :valor="12" /></p>
                <p class="text-[12px] text-muted">grupos</p>
              </div>
              <div class="px-2">
                <p class="text-title"><UiContador :valor="PAINEL_EXEMPLO.hoje.enviadas" /></p>
                <p class="text-[12px] text-muted">enviadas hoje</p>
              </div>
              <div class="px-2">
                <p class="text-title text-status-aprovada">OK</p>
                <p class="text-[12px] text-muted">saúde</p>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <UiBotao bloco @click="navigateTo('/painel/grupos')">
                <UiIcone nome="usuarios" :tamanho="18" /> Ver meus grupos
              </UiBotao>
              <UiBotao variante="secundario" bloco @click="confirmar = true">
                <UiIcone nome="sair" :tamanho="18" /> Desconectar
              </UiBotao>
            </div>
          </div>

          <!-- Desconectado -->
          <div v-else-if="vista === 'desconectado'" key="desconectado" class="flex flex-col gap-5">
            <div class="flex items-start gap-4">
              <span class="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-surface">
                <UiIcone nome="celular" :tamanho="24" />
                <span class="absolute right-0.5 top-0.5 size-3.5 rounded-full border-2 border-elevated bg-status-rejeitada" />
              </span>
              <div>
                <p class="text-title">Conecte seu WhatsApp</p>
                <p class="mt-0.5 text-muted">Sem conexão, as ofertas ficam na fila e nada é enviado.</p>
              </div>
            </div>

            <!-- Escolha do modo -->
            <div class="relative grid grid-cols-2 rounded-full bg-surface p-1">
              <span
                class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-elevated shadow-card transition-transform duration-500 ease-spring"
                :class="modo === 'qr' && 'translate-x-full'"
              />
              <button
                v-for="m in MODOS"
                :key="m.valor"
                type="button"
                class="relative h-10 rounded-full text-label font-semibold transition-colors"
                :class="modo === m.valor ? 'text-fg' : 'text-muted'"
                @click="modo = m.valor"
              >
                {{ m.rotulo }}
              </button>
            </div>

            <Transition name="estado" mode="out-in">
              <form v-if="modo === 'codigo'" key="codigo" class="flex flex-col gap-4" novalidate @submit.prevent="iniciar">
                <p class="text-label text-muted">
                  Melhor opção quando você só tem o celular: o WhatsApp mostra um campo para digitar um código de 8 letras.
                </p>
                <UiCampo
                  v-model="numero"
                  rotulo="Número do WhatsApp com DDD"
                  type="tel"
                  :formatar="formatarTelefone"
                  inputmode="tel"
                  autocomplete="tel-national"
                  :erro="erroNumero"
                />
                <UiBotao type="submit" tamanho="lg" bloco>Gerar código</UiBotao>
              </form>
              <div v-else key="qr" class="flex flex-col gap-4">
                <p class="text-label text-muted">
                  Use quando o WhatsApp estiver em outro aparelho: você aponta a câmera dele para o código nesta tela.
                </p>
                <UiBotao tamanho="lg" bloco @click="iniciar">Gerar QR code</UiBotao>
              </div>
            </Transition>
          </div>

          <!-- Pareando -->
          <div v-else key="pareando" class="flex flex-col gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold">{{ estado.modo === 'codigo' ? 'Digite este código no WhatsApp' : 'Escaneie com o WhatsApp' }}</p>
              <span v-if="estado.status === 'aguardando'" class="shrink-0 text-label tabular-nums text-muted">
                {{ estado.tentativas }}/3
              </span>
            </div>

            <!-- Gerando -->
            <div v-if="estado.status === 'gerando'" class="flex h-40 flex-col items-center justify-center gap-3 rounded bg-surface text-muted">
              <UiSpinner :tamanho="24" />
              {{ estado.modo === 'codigo' ? 'Gerando código…' : 'Gerando QR code…' }}
            </div>

            <!-- Código de pareamento -->
            <div v-else-if="estado.modo === 'codigo'" class="relative flex flex-col items-center gap-3">
              <div class="flex items-center gap-1.5" :class="estado.status === 'conectando' && 'opacity-40 blur-[1px] transition'">
                <span
                  v-for="(c, i) in estado.codigo.split('')"
                  :key="`${estado.codigo}-${i}`"
                  class="animate-pop"
                  :class="c === '-' ? 'px-1 text-title text-muted' : 'flex h-12 w-9 items-center justify-center rounded border border-line bg-surface font-mono text-[22px] font-semibold sm:h-14 sm:w-11 sm:text-[26px]'"
                  :style="{ animationDelay: `${i * 45}ms` }"
                >{{ c }}</span>
              </div>
              <UiBotao v-if="estado.status === 'aguardando'" variante="fantasma" tamanho="sm" @click="copiarCodigo">
                <UiIcone :nome="copiado ? 'check' : 'copiar'" :tamanho="16" /> {{ copiado ? 'Copiado' : 'Copiar código' }}
              </UiBotao>
              <div v-if="estado.status === 'conectando'" class="absolute inset-0 flex items-center justify-center gap-2 font-semibold">
                <UiSpinner /> Conectando…
              </div>
            </div>

            <!-- QR -->
            <div v-else class="mx-auto w-full max-w-[260px]">
              <WhatsappQrCode :semente="estado.semente" :lido="estado.status === 'conectando'">
                <div v-if="estado.status === 'conectando'" class="absolute inset-0 flex items-center justify-center gap-2 font-semibold text-[#0d0d0d]">
                  <UiSpinner /> Conectando…
                </div>
              </WhatsappQrCode>
            </div>

            <!-- Validade -->
            <div v-if="estado.status === 'aguardando'" class="flex items-center gap-3">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  class="h-full rounded-full bg-fg transition-[width] duration-300 ease-linear"
                  :class="restante <= 10 && '!bg-status-rejeitada'"
                  :style="{ width: `${(restante / VALIDADE) * 100}%` }"
                />
              </div>
              <span class="w-24 text-right text-label tabular-nums" :class="restante <= 10 ? 'text-status-rejeitada' : 'text-muted'">
                Expira em {{ tempoTexto }}
              </span>
            </div>

            <!-- Passo a passo -->
            <ol class="flex flex-col gap-3">
              <li v-for="(p, i) in PASSOS" :key="p" class="flex gap-3">
                <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-[12px] font-semibold">{{ i + 1 }}</span>
                <span class="text-label">{{ p }}</span>
              </li>
            </ol>

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <UiBotao variante="fantasma" :disabled="estado.status === 'conectando'" @click="cancelar">Cancelar</UiBotao>
              <UiBotao
                ref="botaoPrevia"
                variante="secundario"
                class="border-dashed"
                :disabled="estado.status !== 'aguardando'"
                @click="conectarPrevia"
              >
                Simular conexão (prévia)
              </UiBotao>
            </div>
          </div>
        </Transition>
      </UiCard>

      <!-- Dicas -->
      <aside class="flex flex-col gap-3">
        <h2 v-reveal class="font-semibold">Para o número não ser bloqueado</h2>
        <UiCard class="divide-y divide-line">
          <div v-for="(d, i) in DICAS" :key="d.titulo" v-reveal="i * 60" class="flex gap-3 p-4">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface"><UiIcone :nome="d.icone" :tamanho="16" /></span>
            <div>
              <p class="text-label font-semibold">{{ d.titulo }}</p>
              <p class="text-label text-muted">{{ d.texto }}</p>
            </div>
          </div>
        </UiCard>
      </aside>
    </div>

    <UiDialogo
      v-model="confirmar"
      titulo="Desconectar o WhatsApp?"
      descricao="Os envios para os grupos param até você conectar de novo. As ofertas continuam chegando e ficam na fila."
    >
      <template #icone>
        <span class="mb-4 flex size-12 items-center justify-center rounded-full bg-status-rejeitada/10 text-status-rejeitada">
          <UiIcone nome="sair" :tamanho="22" />
        </span>
      </template>
      <template #acoes>
        <UiBotao variante="secundario" :disabled="desconectando" @click="confirmar = false">Cancelar</UiBotao>
        <UiBotao variante="perigo" :carregando="desconectando" @click="confirmarDesconexao">
          Desconectar
          <template #carregando>Desconectando…</template>
        </UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.estado-enter-active { transition: opacity .25s ease, transform .4s cubic-bezier(.22, 1, .36, 1); }
.estado-leave-active { transition: opacity .15s ease, transform .15s ease; }
.estado-enter-from { opacity: 0; transform: translateY(10px); }
.estado-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
