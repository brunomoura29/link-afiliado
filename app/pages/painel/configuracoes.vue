<script setup lang="ts">
import type { Configuracoes } from '~/composables/useConfiguracoes'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Configurações · LinkAfiliado' })

const toast = useToast()
const { config, salvar } = useConfiguracoes()

// Edita uma cópia; a barra de salvar aparece quando algo muda
const r = reactive<Configuracoes>({ ...config.value })
const sujo = computed(() => JSON.stringify(r) !== JSON.stringify(config.value))
function descartar() {
  Object.assign(r, config.value)
}

// Intervalo: o máximo nunca fica abaixo do mínimo
watch(() => r.intervaloMin, (min) => { if (r.intervaloMax < min) r.intervaloMax = min })
watch(() => r.intervaloMax, (max) => { if (r.intervaloMin > max) r.intervaloMin = max })
watch(() => r.telefone, (v) => {
  const f = formatarTelefone(v)
  if (f !== v) r.telefone = f
})

const resumo = computed(() => {
  const janela = r.pausaNoturna ? `entre ${r.inicio} e ${r.fim}` : 'a qualquer hora'
  return `Até ${r.limiteDiario} ofertas por grupo por dia, uma a cada ${r.intervaloMin}–${r.intervaloMax} min, ${janela}.`
})

// Prévia da legenda com o tom escolhido
const TONS = [
  { valor: 'animado', rotulo: 'Animado' },
  { valor: 'direto', rotulo: 'Direto ao ponto' },
  { valor: 'profissional', rotulo: 'Profissional' }
]
const previa = computed(() => {
  const base = {
    animado: '🔥 Achado do dia! Air fryer 4L de R$ 449,00 por R$ 299,00 (33% OFF). Corre que é por tempo limitado! 🏃',
    direto: '🍳 Air fryer 4L: de R$ 449,00 por R$ 299,00 (33% OFF).',
    profissional: 'Oferta: Air fryer 4L digital. De R$ 449,00 por R$ 299,00, desconto de 33%.'
  }[r.tom]
  const texto = r.emojis ? base : base.replace(/\p{Extended_Pictographic}️?\s?/gu, '').trim()
  return `${texto}\n\n👉 meli.la/3kQz7${r.rodape.trim() ? `\n\n${r.rodape.trim()}` : ''}`
})

const erroHorario = computed(() => r.pausaNoturna && r.inicio === r.fim ? 'Início e fim não podem ser iguais' : '')
const erroEmail = ref('')
watch(() => r.email, () => (erroEmail.value = ''))

const salvando = ref(false)
const salvo = ref(false)
async function salvarTudo() {
  erroEmail.value = ehEmail(r.email) ? '' : 'Informe um e-mail válido'
  if (erroHorario.value || erroEmail.value) {
    toast.erro('Confira os campos destacados')
    return
  }
  salvando.value = true
  await salvar({ ...r })
  salvando.value = false
  salvo.value = true
  toast.sucesso('Configurações salvas')
  setTimeout(() => (salvo.value = false), 1200)
}

// Excluir conta
const excluirAberto = ref(false)
const textoConfirmacao = ref('')
const excluindo = ref(false)
async function excluirConta() {
  excluindo.value = true
  await new Promise(res => setTimeout(res, 1200)) // TODO: Supabase (apagar dados + desconectar UazAPI)
  excluindo.value = false
  excluirAberto.value = false
  toast.info('Prévia', 'Aqui a conta seria excluída e você voltaria para o login.')
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
    <header>
      <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Configurações</h1>
      <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Regras de envio, jeito da legenda e dados da sua conta.</p>
    </header>

    <!-- Envio -->
    <section v-reveal>
      <h2 class="mb-3 font-semibold">Envio nos grupos</h2>
      <UiCard class="flex flex-col gap-5 p-5">
        <UiNumero v-model="r.limiteDiario" rotulo="Ofertas por grupo, por dia" :min="1" :max="50" />
        <div class="h-px bg-line" />
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-label font-semibold">Intervalo entre envios</p>
            <p class="text-[12px] text-muted">Um tempo aleatório dentro dessa faixa, para não parecer robô.</p>
          </div>
          <UiNumero v-model="r.intervaloMin" rotulo="No mínimo" :min="2" :max="240" sufixo="min" />
          <UiNumero v-model="r.intervaloMax" rotulo="No máximo" :min="2" :max="240" sufixo="min" />
        </div>
        <div class="h-px bg-line" />
        <UiInterruptor v-model="r.pausaNoturna" rotulo="Enviar só em horário comercial" descricao="Fora da janela, as ofertas esperam na fila." />
        <Transition name="abrir">
          <div v-if="r.pausaNoturna" class="grid grid-cols-2 gap-3">
            <UiCampo v-model="r.inicio" rotulo="Começa às" type="time" :erro="erroHorario" />
            <UiCampo v-model="r.fim" rotulo="Termina às" type="time" />
          </div>
        </Transition>
        <p class="flex items-start gap-2 rounded bg-surface p-3 text-label">
          <UiIcone nome="relogio" :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
          <span>{{ resumo }}</span>
        </p>
      </UiCard>
    </section>

    <!-- Legenda -->
    <section v-reveal>
      <h2 class="mb-3 font-semibold">Legenda</h2>
      <UiCard class="flex flex-col gap-5 p-5">
        <UiSelecao v-model="r.tom" rotulo="Tom do texto" :opcoes="TONS" />
        <UiInterruptor v-model="r.emojis" rotulo="Usar emojis" />
        <UiCampo v-model="r.rodape" rotulo="Rodapé fixo (opcional)" dica="Vai no fim de toda legenda. Ex.: 📢 Siga @lojadaana" />
        <div>
          <p class="mb-2 text-label font-semibold">Prévia</p>
          <div class="rounded-lg bg-[#efeae2] p-3 dark:bg-[#0b141a]">
            <Transition name="abrir" mode="out-in">
              <p
                :key="previa"
                class="max-w-[92%] whitespace-pre-line rounded-lg rounded-tl-sm bg-[#d9fdd3] px-3 py-2 text-[14px] leading-5 text-[#111b21] shadow-sm dark:bg-[#144d37] dark:text-[#e9edef]"
              >{{ previa }}</p>
            </Transition>
          </div>
          <p class="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            <UiIcone nome="cadeado" :tamanho="12" /> O tom muda o texto; preço e desconto continuam vindo do produto.
          </p>
        </div>
      </UiCard>
    </section>

    <!-- Conta -->
    <section v-reveal>
      <h2 class="mb-3 font-semibold">Sua conta</h2>
      <UiCard class="flex flex-col gap-4 p-5">
        <UiCampo v-model="r.nome" rotulo="Nome" autocomplete="name" />
        <UiCampo v-model="r.email" rotulo="E-mail" type="email" inputmode="email" autocomplete="email" :erro="erroEmail" />
        <UiCampo v-model="r.telefone" rotulo="Celular com DDD" type="tel" inputmode="tel" autocomplete="tel-national" />
        <UiBotao variante="secundario" tamanho="sm" class="self-start" @click="toast.info('Em breve', 'A troca de senha entra junto com o backend.')">
          <UiIcone nome="cadeado" :tamanho="16" /> Trocar senha
        </UiBotao>
      </UiCard>
    </section>

    <!-- Zona de perigo -->
    <section v-reveal>
      <UiCard class="flex flex-col gap-3 !border-status-rejeitada/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-semibold">Excluir conta</p>
          <p class="text-label text-muted">Apaga categorias, ofertas, links e leads, e desconecta o WhatsApp.</p>
        </div>
        <UiBotao variante="secundario" tamanho="sm" class="shrink-0 text-status-rejeitada" @click="excluirAberto = true; textoConfirmacao = ''">
          Excluir conta
        </UiBotao>
      </UiCard>
    </section>

    <!-- Barra de salvar -->
    <Transition name="barra">
      <div
        v-if="sujo"
        class="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-64"
      >
        <div class="mx-auto flex max-w-2xl items-center gap-3 rounded-lg border border-line bg-elevated p-3 pl-4 shadow-pop">
          <span class="relative flex size-2 shrink-0">
            <span class="absolute inset-0 animate-ring-out rounded-full bg-fg" />
            <span class="relative size-2 rounded-full bg-fg" />
          </span>
          <span class="flex-1 text-label font-semibold">Alterações não salvas</span>
          <UiBotao variante="fantasma" tamanho="sm" :disabled="salvando" @click="descartar">Descartar</UiBotao>
          <UiBotao tamanho="sm" :carregando="salvando" :sucesso="salvo" @click="salvarTudo">
            Salvar
            <template #carregando>Salvando…</template>
            <template #sucesso>Salvo!</template>
          </UiBotao>
        </div>
      </div>
    </Transition>

    <UiDialogo
      v-model="excluirAberto"
      titulo="Excluir sua conta?"
      descricao="Isso apaga tudo e não dá para desfazer. Seus grupos continuam existindo no WhatsApp, mas param de receber ofertas."
    >
      <UiCampo v-model="textoConfirmacao" rotulo='Digite "EXCLUIR" para confirmar' />
      <template #acoes>
        <UiBotao variante="secundario" :disabled="excluindo" @click="excluirAberto = false">Cancelar</UiBotao>
        <UiBotao variante="perigo" :disabled="textoConfirmacao.trim().toUpperCase() !== 'EXCLUIR'" :carregando="excluindo" @click="excluirConta">
          Excluir para sempre
          <template #carregando>Excluindo…</template>
        </UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.abrir-enter-active { transition: opacity .25s ease, transform .3s cubic-bezier(.22, 1, .36, 1); }
.abrir-leave-active { transition: opacity .12s ease; }
.abrir-enter-from { opacity: 0; transform: translateY(-6px); }
.abrir-leave-to { opacity: 0; }

.barra-enter-active { transition: transform .45s cubic-bezier(.34, 1.56, .64, 1), opacity .2s ease; }
.barra-leave-active { transition: transform .25s ease-in, opacity .2s ease; }
.barra-enter-from, .barra-leave-to { transform: translateY(24px); opacity: 0; }
</style>
