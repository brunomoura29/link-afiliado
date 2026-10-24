<script setup lang="ts">
import type { Oferta } from '~/composables/useOfertas'
import type { CategoriaGrupo } from '~/composables/useGrupos'

const props = defineProps<{ oferta: Oferta, categoria?: CategoriaGrupo }>()
const emit = defineEmits<{ fechar: [] }>()

const toast = useToast()
const { novaLegenda, tentarNovamente, enviarAgora, excluir } = useOfertas()

const desconto = computed(() => props.oferta.preco != null && props.oferta.original
  ? Math.round((1 - props.oferta.preco / props.oferta.original) * 100) : null)

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

const processando = ref<'enviar' | 'tentar' | 'excluir' | null>(null)
const falhou = () => toast.erro('Não foi possível concluir', 'Verifique sua internet e tente de novo.')
async function enviar() {
  processando.value = 'enviar'
  const enviou = await enviarAgora(props.oferta)
  processando.value = null
  if (!enviou) return
  toast.whatsapp('Oferta enviada', `Publicada em ${props.oferta.envios.length} grupos.`)
}
async function tentar() {
  processando.value = 'tentar'
  try {
    await tentarNovamente(props.oferta)
    toast.info('Na fila de novo', 'Vamos tentar ler o produto outra vez.')
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
        <p class="text-[12px] text-muted">preço</p>
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

    <!-- Envios -->
    <section v-if="oferta.envios.length">
      <p class="mb-2 font-semibold">Grupos</p>
      <ul class="flex flex-col divide-y divide-line rounded border border-line">
        <li v-for="e in oferta.envios" :key="e.grupo" class="flex items-center gap-3 p-3">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-full" :class="ICONE_ENVIO[e.status].classe">
            <UiIcone :nome="ICONE_ENVIO[e.status].icone" :tamanho="14" :traco="2.5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-label font-semibold">{{ e.grupo }}</span>
            <span class="block text-[12px]" :class="e.status === 'erro' ? 'text-status-rejeitada' : 'text-muted'">
              {{ e.status === 'enviado' ? `Enviada ${tempoRelativo(e.quando)}` : e.status === 'na_fila' ? 'Na fila, aguardando o intervalo' : 'Falhou: o número pode ter saído do grupo' }}
            </span>
          </span>
        </li>
      </ul>
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
