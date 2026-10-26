<script setup lang="ts">
import type { Oferta } from '~/composables/useOfertas'
import type { CategoriaGrupo } from '~/composables/useGrupos'

const props = defineProps<{ oferta: Oferta, categoria?: CategoriaGrupo }>()
const emit = defineEmits<{ fechar: [] }>()

const toast = useToast()
const { novaLegenda, tentarNovamente, enviarAgora, excluir, configurarRepeticao, enviarDeNovo } = useOfertas()

const desconto = computed(() => Number(props.oferta.descontoRotulo?.match(/\d+/)?.[0])
  || (props.oferta.preco != null && props.oferta.original ? Math.round((1 - props.oferta.preco / props.oferta.original) * 100) : null))

// Legenda: gerar outra com efeito de digitação
const gerando = ref(false)
const digitando = ref(false)
async function outraLegenda() {
  gerando.value = true
  const texto = await novaLegenda(props.oferta)
  gerando.value = false
  if (!texto) return
  digitando.value = true
  props.oferta.legenda = ''
  for (const ch of texto) {
    props.oferta.legenda += ch
    await new Promise(r => setTimeout(r, ch === ' ' ? 6 : 12))
  }
  digitando.value = false
}

const copiado = ref(false)
async function copiarLegenda() {
  if (!props.oferta.legenda) return
  try { await navigator.clipboard.writeText(props.oferta.legenda) } catch {}
  copiado.value = true
  toast.sucesso('Legenda copiada')
  setTimeout(() => (copiado.value = false), 1500)
}

const processando = ref<'enviar' | 'denovo' | 'tentar' | 'excluir' | null>(null)
const falhou = () => toast.erro('Não foi possível concluir', 'Verifique sua internet e tente de novo.')
async function enviar() {
  processando.value = 'enviar'
  const r = await enviarAgora(props.oferta)
  processando.value = null
  if (!r) return
  toast.whatsapp(
    r.enviados ? 'Oferta enviada' : 'Oferta na frente da fila',
    r.naFila ? `Já foi para ${r.enviados} grupo(s). Os outros ${r.naFila} recebem no intervalo normal, para proteger o número.` : `Publicada em ${r.enviados} grupo(s).`
  )
}
async function deNovo() {
  processando.value = 'denovo'
  const r = await enviarDeNovo(props.oferta)
  processando.value = null
  if (!r) return
  toast.whatsapp(
    'Enviada de novo',
    r.naFila ? `Já foi para ${r.enviados} grupo(s), com o preço lido agora. Os outros ${r.naFila} recebem no intervalo normal.` : `Publicada em ${r.enviados} grupo(s), com o preço lido agora.`
  )
}

// Repetição automática: salva a cada mudança (e salvar tira a pausa)
const salvandoRepeticao = ref(false)
const repeticao = computed({
  get: () => ({ aCadaDias: props.oferta.repeticao.aCadaDias, max: props.oferta.repeticao.max }),
  set: async (cfg: { aCadaDias: number | null, max: number }) => {
    salvandoRepeticao.value = true
    await configurarRepeticao(props.oferta, cfg)
    salvandoRepeticao.value = false
  }
})
async function retomarRepeticao() {
  salvandoRepeticao.value = true
  if (await configurarRepeticao(props.oferta, repeticao.value)) toast.sucesso('Repetição retomada')
  salvandoRepeticao.value = false
}
const dataCurta = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Envios agrupados por rodada (a mais recente primeiro)
const rodadas = computed(() => {
  const porRodada = new Map<number, typeof props.oferta.envios>()
  for (const e of props.oferta.envios) porRodada.set(e.rodada, [...(porRodada.get(e.rodada) ?? []), e])
  return [...porRodada.entries()].sort((a, b) => b[0] - a[0]).map(([n, envios]) => ({
    n,
    titulo: n === 1 ? '1º envio' : `${n - 1}ª repetição`,
    quando: envios.map(e => e.quando).filter(Boolean).sort()[0] ?? null,
    envios
  }))
})

async function tentar() {
  processando.value = 'tentar'
  try {
    await tentarNovamente(props.oferta)
    toast.info('Lendo o produto de novo', 'Em alguns segundos a oferta atualiza sozinha.')
  } catch {
    falhou()
  }
  processando.value = null
}
const confirmandoExclusao = ref(false)
async function confirmarExclusao() {
  processando.value = 'excluir'
  try {
    await excluir(props.oferta)
  } catch {
    processando.value = null
    return falhou()
  }
  processando.value = null
  toast.info('Oferta excluída')
  emit('fechar')
}

const ICONE_ENVIO = {
  enviado: { icone: 'check', classe: 'bg-whatsapp text-[#0b3d1f]' },
  na_fila: { icone: 'relogio', classe: 'bg-surface text-muted' },
  enviando: { icone: 'enviar', classe: 'bg-surface text-muted' },
  erro: { icone: 'alerta', classe: 'bg-status-rejeitada text-white' }
} as const
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Produto -->
    <div class="flex items-start gap-3">
      <span
        class="relative flex size-16 shrink-0 items-center justify-center rounded"
        :style="{ background: `linear-gradient(135deg, hsl(${oferta.matiz} 70% 92%), hsl(${oferta.matiz + 40} 70% 82%))` }"
      >
        <img v-if="oferta.imagem" :src="oferta.imagem" alt="" class="size-full rounded object-cover">
        <UiSpinner v-else-if="oferta.status === 'pendente'" class="text-black/40" />
        <UiIcone v-else nome="sacola" :tamanho="26" :traco="1.5" class="text-black/30" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ oferta.titulo ?? (oferta.status === 'pendente' ? 'Lendo a página do produto…' : 'Produto não identificado') }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <UiBadgePlataforma :plataforma="oferta.plataforma" />
          <UiStatus :status="oferta.status" />
        </div>
      </div>
    </div>

    <div v-if="oferta.preco != null" class="grid grid-cols-3 divide-x divide-line rounded border border-line bg-surface py-3 text-center">
      <div class="px-2">
        <p class="text-title">{{ formatarPreco(oferta.preco) }}</p>
        <p class="text-[12px] text-muted">preço{{ oferta.condicao ? ` ${oferta.condicao}` : '' }}</p>
      </div>
      <div class="px-2">
        <p class="text-title text-muted line-through decoration-1">{{ oferta.original ? formatarPreco(oferta.original) : '—' }}</p>
        <p class="text-[12px] text-muted">de</p>
      </div>
      <div class="px-2">
        <p class="text-title text-status-aprovada">{{ desconto ? `${desconto}%` : '—' }}</p>
        <p class="text-[12px] text-muted">desconto</p>
      </div>
    </div>

    <!-- Pendente -->
    <div v-if="oferta.status === 'pendente'" class="flex flex-col gap-3 rounded border border-line bg-surface p-4">
      <p class="flex items-start gap-2 text-label">
        <UiSpinner :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
        <span>Lendo a página do produto e escrevendo a legenda. Costuma levar poucos segundos.</span>
      </p>
      <UiBotao variante="secundario" tamanho="sm" class="self-start" :carregando="processando === 'tentar'" @click="tentar">
        <UiIcone nome="atualizar" :tamanho="16" /> Ler de novo
        <template #carregando>Pedindo…</template>
      </UiBotao>
    </div>

    <!-- Loja que esconde o preço (ex.: Shopee) -->
    <p v-if="oferta.status !== 'pendente' && oferta.status !== 'rejeitada' && oferta.preco == null" class="flex items-start gap-2 rounded bg-surface p-3 text-label">
      <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
      <span>
        A {{ nomePlataforma(oferta.plataforma) }} não mostra o preço sem login, então a legenda {{ desconto ? `destaca os ${desconto}% OFF e` : '' }}
        convida a conferir o preço no link.
      </span>
    </p>

    <!-- Rejeitada -->
    <div v-if="oferta.status === 'rejeitada'" class="flex flex-col gap-3 rounded border border-status-rejeitada/40 bg-status-rejeitada/5 p-4">
      <p class="flex items-start gap-2 text-label">
        <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0 text-status-rejeitada" />
        <span><strong class="text-status-rejeitada">Não foi enviada.</strong> {{ oferta.motivo }}</span>
      </p>
      <UiBotao variante="secundario" tamanho="sm" class="self-start" :carregando="processando === 'tentar'" @click="tentar">
        <UiIcone nome="atualizar" :tamanho="16" /> Tentar de novo
        <template #carregando>Lendo o produto…</template>
      </UiBotao>
    </div>

    <!-- Prévia da mensagem -->
    <section v-if="oferta.legenda !== null || gerando">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="font-semibold">Como fica no grupo</p>
        <div class="flex gap-1">
          <UiBotao variante="fantasma" tamanho="sm" :disabled="gerando || digitando" @click="outraLegenda">
            <UiIcone nome="brilho" :tamanho="16" /> Outra
          </UiBotao>
          <UiBotao variante="fantasma" tamanho="sm" :disabled="gerando || digitando" @click="copiarLegenda">
            <UiIcone :nome="copiado ? 'check' : 'copiar'" :tamanho="16" /> {{ copiado ? 'Copiada' : 'Copiar' }}
          </UiBotao>
        </div>
      </div>
      <div class="rounded-lg bg-[#efeae2] p-3 dark:bg-[#0b141a]">
        <div class="max-w-[92%] rounded-lg rounded-tl-sm bg-[#d9fdd3] p-1.5 text-[14px] leading-5 text-[#111b21] shadow-sm dark:bg-[#144d37] dark:text-[#e9edef]">
          <div
            class="mb-1.5 flex h-28 items-center justify-center rounded"
            :style="{ background: `linear-gradient(135deg, hsl(${oferta.matiz} 70% 92%), hsl(${oferta.matiz + 40} 70% 82%))` }"
          >
            <img v-if="oferta.imagem" :src="oferta.imagem" alt="" class="size-full rounded object-cover">
            <UiIcone v-else nome="sacola" :tamanho="36" :traco="1.5" class="text-black/25" />
          </div>
          <p class="whitespace-pre-line break-words px-1.5 pb-1">
            <template v-if="gerando"><span class="inline-flex gap-1 py-1"><span v-for="i in 3" :key="i" class="size-1.5 animate-bounce3 rounded-full bg-current opacity-50" :style="{ animationDelay: `${i * 150}ms` }" /></span></template>
            <template v-else>{{ oferta.legenda }}<span v-if="digitando" class="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink bg-current" /></template>
          </p>
        </div>
      </div>
      <p class="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
        <UiIcone nome="cadeado" :tamanho="12" /> Preço e desconto vêm da página do produto; a IA só escreve o texto.
      </p>
    </section>

    <!-- Envios (por rodada) -->
    <section v-if="oferta.envios.length" class="flex flex-col gap-4">
      <div v-for="r in rodadas" :key="r.n">
        <p class="mb-2 flex items-baseline justify-between gap-2">
          <span class="font-semibold">{{ rodadas.length > 1 ? r.titulo : 'Grupos' }}</span>
          <span v-if="r.quando" class="text-[12px] text-muted">{{ dataCurta(r.quando) }}</span>
        </p>
        <ul class="flex flex-col divide-y divide-line rounded border border-line">
          <li v-for="(e, i) in r.envios" :key="`${e.grupo}-${i}`" class="flex items-center gap-3 p-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full" :class="ICONE_ENVIO[e.status].classe">
              <UiIcone :nome="ICONE_ENVIO[e.status].icone" :tamanho="14" :traco="2.5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-label font-semibold">{{ e.grupo }}</span>
              <span class="block text-[12px]" :class="e.status === 'erro' ? 'text-status-rejeitada' : 'text-muted'">
                {{ e.status === 'enviado' ? `Enviada ${tempoRelativo(e.quando)}` : e.status === 'na_fila' ? 'Na fila, aguardando o intervalo' : e.status === 'enviando' ? 'Enviando…' : e.erro ?? 'Não foi enviada' }}
              </span>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Repetição automática -->
    <section v-if="oferta.status === 'aprovada' || oferta.status === 'enviada'" class="flex flex-col gap-3 rounded border border-line p-4">
      <OfertasRepeticao v-model="repeticao" :disabled="salvandoRepeticao" />
      <div v-if="oferta.repeticao.pausada" class="flex flex-col gap-2 rounded bg-status-rejeitada/5 p-3 text-label">
        <p class="flex items-start gap-2">
          <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0 text-status-rejeitada" />
          <span><strong class="text-status-rejeitada">Repetição pausada.</strong> {{ oferta.repeticao.pausada }}</span>
        </p>
        <UiBotao tamanho="sm" variante="secundario" class="self-start" :carregando="salvandoRepeticao" @click="retomarRepeticao">
          Retomar repetição
          <template #carregando>Salvando…</template>
        </UiBotao>
      </div>
      <p v-else-if="oferta.repeticao.aCadaDias" class="text-[12px] text-muted">
        {{ oferta.repeticao.feitas }} de {{ oferta.repeticao.max }} repetições feitas.
        <template v-if="oferta.repeticao.proxima">Próxima: {{ dataCurta(oferta.repeticao.proxima) }} (o preço é lido de novo antes).</template>
        <template v-else-if="oferta.repeticao.feitas >= oferta.repeticao.max">Concluída.</template>
        <template v-else-if="oferta.status === 'aprovada'">A próxima é marcada quando este envio terminar.</template>
      </p>
    </section>

    <!-- Informações -->
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-label">
      <dt class="text-muted">Categoria</dt>
      <dd>{{ categoria ? `${categoria.emoji} ${categoria.nome}` : 'Sem categoria' }}</dd>
      <dt class="text-muted">Enviada por</dt>
      <dd>{{ oferta.origem }}</dd>
      <dt class="text-muted">Recebida</dt>
      <dd>{{ tempoRelativo(oferta.criadaEm) }}</dd>
      <dt class="text-muted">Link</dt>
      <dd class="min-w-0">
        <a :href="oferta.link" target="_blank" rel="noopener" class="block truncate font-mono text-ml-blue underline-offset-4 hover:underline">{{ oferta.link.replace('https://', '') }}</a>
      </dd>
    </dl>

    <!-- Ações -->
    <div class="flex flex-col gap-3 border-t border-line pt-4">
      <UiBotao v-if="oferta.status === 'aprovada'" variante="whatsapp" bloco :carregando="processando === 'enviar'" @click="enviar">
        <UiIcone nome="enviar" :tamanho="18" /> Enviar agora, sem esperar a fila
        <template #carregando>Enviando…</template>
      </UiBotao>
      <UiBotao v-if="oferta.status === 'enviada'" variante="secundario" bloco :carregando="processando === 'denovo'" @click="deNovo">
        <UiIcone nome="atualizar" :tamanho="18" /> Enviar de novo agora
        <template #carregando>Lendo o produto e enviando…</template>
      </UiBotao>
      <Transition name="troca" mode="out-in">
        <div v-if="confirmandoExclusao" key="c" class="flex flex-col gap-3 rounded border border-status-rejeitada/40 bg-status-rejeitada/5 p-3">
          <p class="text-label">Excluir esta oferta? <template v-if="oferta.status !== 'enviada'">Ela sai da fila e não será enviada.</template><template v-else>Mensagens já enviadas continuam nos grupos.</template></p>
          <div class="flex gap-2">
            <UiBotao tamanho="sm" variante="perigo" :carregando="processando === 'excluir'" @click="confirmarExclusao">Excluir</UiBotao>
            <UiBotao tamanho="sm" variante="fantasma" @click="confirmandoExclusao = false">Cancelar</UiBotao>
          </div>
        </div>
        <button v-else key="b" type="button" class="self-start text-label font-semibold text-status-rejeitada" @click="confirmandoExclusao = true">
          Excluir oferta
        </button>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.troca-enter-active, .troca-leave-active { transition: opacity .2s ease, transform .2s ease; }
.troca-enter-from, .troca-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
