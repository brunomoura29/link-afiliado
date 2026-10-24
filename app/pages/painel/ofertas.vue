<script setup lang="ts">
import type { Oferta } from '~/composables/useOfertas'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Ofertas · LinkAfiliado' })

const { ofertas } = useOfertas()
const { categorias } = useGrupos()
const categoriaDe = (o: Oferta) => categorias.value.find(c => c.id === o.categoriaId)

// Filtros
type Filtro = 'todas' | 'fila' | 'enviada' | 'rejeitada'
const filtro = ref<Filtro>('todas')
const busca = ref('')
const categoria = ref('')
const passaStatus = (o: Oferta, f: Filtro) =>
  f === 'todas' || (f === 'fila' ? o.status === 'pendente' || o.status === 'aprovada' : o.status === f)

const FILTROS = computed(() => ([
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'fila', rotulo: 'Na fila' },
  { valor: 'enviada', rotulo: 'Enviadas' },
  { valor: 'rejeitada', rotulo: 'Rejeitadas' }
] as const).map(f => ({ ...f, total: ofertas.value.filter(o => passaStatus(o, f.valor)).length })))

const opcoesCategoria = computed(() => [
  { valor: '', rotulo: 'Todas as categorias' },
  ...categorias.value.map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` }))
])

const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const filtradas = computed(() => ofertas.value
  .filter(o => passaStatus(o, filtro.value))
  .filter(o => !categoria.value || o.categoriaId === categoria.value)
  .filter(o => !busca.value || normalizar(`${o.titulo ?? ''} ${o.link} ${o.origem}`).includes(normalizar(busca.value)))
  .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)))

// Agrupa por dia: Hoje / Ontem / dd de mês
function rotuloDia(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 86_400_000)
  const mesmo = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (mesmo(d, hoje)) return 'Hoje'
  if (mesmo(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}
const porDia = computed(() => {
  const grupos: { dia: string, itens: Oferta[] }[] = []
  for (const o of filtradas.value) {
    const dia = rotuloDia(o.criadaEm)
    const atual = grupos.at(-1)
    if (atual?.dia === dia) atual.itens.push(o)
    else grupos.push({ dia, itens: [o] })
  }
  return grupos
})

function limparFiltros() {
  filtro.value = 'todas'
  busca.value = ''
  categoria.value = ''
}

// Detalhes / nova
const selecionada = ref<Oferta | null>(null)
const detalhesAberto = computed({ get: () => !!selecionada.value, set: v => !v && (selecionada.value = null) })
const novaAberta = ref(false)
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Ofertas</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Tudo que entrou, do link colado até o envio nos grupos.</p>
      </div>
      <UiBotao tamanho="sm" class="shrink-0" @click="novaAberta = true">
        <span class="text-[18px] leading-none">+</span> Nova
      </UiBotao>
    </header>

    <!-- Status -->
    <div class="-mx-4 animate-fade-up overflow-x-auto px-4 [animation-delay:100ms] [scrollbar-width:none]">
      <div class="flex w-max gap-2">
        <button
          v-for="f in FILTROS"
          :key="f.valor"
          type="button"
          class="flex h-9 items-center gap-2 rounded-full border px-4 text-label font-semibold transition-[background-color,border-color,color] duration-200 active:scale-95"
          :class="filtro === f.valor ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:text-fg'"
          @click="filtro = f.valor"
        >
          {{ f.rotulo }}
          <span
            class="min-w-5 rounded-full px-1.5 text-[12px] tabular-nums"
            :class="filtro === f.valor ? 'bg-bg/20' : 'bg-surface'"
          >{{ f.total }}</span>
        </button>
      </div>
    </div>

    <div class="grid animate-fade-up gap-3 [animation-delay:140ms] sm:grid-cols-[1fr_240px]">
      <UiCampo v-model="busca" rotulo="Buscar produto, link ou quem enviou">
        <template #fim>
          <button v-if="busca" type="button" aria-label="Limpar busca" class="flex size-8 items-center justify-center rounded text-muted hover:text-fg" @click="busca = ''">
            <UiIcone nome="x" :tamanho="16" />
          </button>
        </template>
      </UiCampo>
      <UiSelecao v-model="categoria" rotulo="Categoria" :opcoes="opcoesCategoria" />
    </div>

    <!-- Lista por dia -->
    <TransitionGroup v-if="porDia.length" tag="div" name="lista" class="flex flex-col gap-5">
      <section v-for="g in porDia" :key="g.dia">
        <h2 class="mb-2 text-label font-semibold text-muted">{{ g.dia }}</h2>
        <UiCard class="overflow-hidden">
          <TransitionGroup tag="div" name="lista" class="divide-y divide-line">
            <OfertasLinha
              v-for="o in g.itens"
              :key="o.id"
              :oferta="o"
              :categoria="categoriaDe(o)"
              @abrir="selecionada = o"
            />
          </TransitionGroup>
        </UiCard>
      </section>
    </TransitionGroup>

    <UiCard v-else class="flex flex-col items-center gap-3 p-8 text-center">
      <span class="flex size-14 items-center justify-center rounded-full bg-surface"><UiIcone nome="sacola" :tamanho="24" /></span>
      <p class="font-semibold">{{ ofertas.length ? 'Nenhuma oferta com esses filtros' : 'Nenhuma oferta ainda' }}</p>
      <p class="max-w-xs text-label text-muted">
        {{ ofertas.length ? 'Tente outro status, categoria ou busca.' : 'Mande o link do formulário para o seu assistente ou cadastre a primeira aqui.' }}
      </p>
      <UiBotao v-if="ofertas.length" variante="secundario" @click="limparFiltros">Limpar filtros</UiBotao>
      <UiBotao v-else @click="novaAberta = true">Cadastrar oferta</UiBotao>
    </UiCard>

    <UiDialogo v-model="detalhesAberto" titulo="Oferta" largura="larga">
      <OfertasDetalhes
        v-if="selecionada"
        :key="selecionada.id"
        :oferta="selecionada"
        :categoria="categoriaDe(selecionada)"
        @fechar="selecionada = null"
      />
    </UiDialogo>

    <UiDialogo v-model="novaAberta" titulo="Nova oferta" descricao="Escolha a categoria e cole o link de afiliado.">
      <OfertasNova v-if="novaAberta" @fechar="novaAberta = false" />
    </UiDialogo>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1); }
.lista-leave-active { transition: opacity .15s ease; }
.lista-enter-from { opacity: 0; transform: translateY(-8px); }
.lista-leave-to { opacity: 0; }
.lista-move { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
</style>
