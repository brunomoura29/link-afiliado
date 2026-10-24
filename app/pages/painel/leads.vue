<script setup lang="ts">
import type { Lead, Periodo } from '~/composables/useLeads'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Leads · LinkAfiliado' })

const toast = useToast()
const { categorias } = useGrupos()
const { cliquesPorOrigem, cliquesPorCategoria, leadsDoPeriodo, novosMembros } = useLeads()

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' }
] as const
const periodo = ref<Periodo>('7d')
const indicePeriodo = computed(() => PERIODOS.findIndex(p => p.valor === periodo.value))

const origens = computed(() => cliquesPorOrigem(periodo.value))
const totalCliques = computed(() => origens.value.reduce((s, o) => s + o.valor, 0))
const porCategoria = computed(() => cliquesPorCategoria(periodo.value).map((c) => {
  const cat = categorias.value.find(x => x.id === c.id)
  return { chave: c.id, rotulo: cat ? `${cat.emoji} ${cat.nome}` : c.id, valor: c.valor }
}))
const pessoas = computed(() => leadsDoPeriodo(periodo.value))
const membros = computed(() => novosMembros(periodo.value))
const porClique = computed(() => totalCliques.value ? (membros.value / totalCliques.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0')
const entraram = computed(() => pessoas.value.filter(l => l.entrou).length)

// Funil: cliques → novos membros; palavra-chave ao lado (é o único caminho com nome e número)
const NUMEROS = computed(() => [
  { rotulo: 'Cliques nos links', valor: totalCliques.value, icone: 'link', nota: 'Só quantidade, sem identificar quem' },
  { rotulo: 'Novos membros', valor: membros.value, icone: 'usuarios', nota: `≈ ${porClique.value} por clique · todos que entraram nos grupos` },
  { rotulo: 'Pediram pela palavra-chave', valor: pessoas.value.length, icone: 'mensagem', nota: `${entraram.value} já entraram no grupo` }
] as const)

const nomeCategoria = (id: string) => {
  const c = categorias.value.find(x => x.id === id)
  return c ? `${c.emoji} ${c.nome}` : 'Sem categoria'
}

const conversa = (l: Lead) => `https://wa.me/${l.numero.replace(/\D/g, '')}`

// Planilha (separador ";" e BOM para abrir certo no Excel em português)
function exportar() {
  const linhas = [
    ['Nome', 'Número', 'Palavra-chave', 'Categoria', 'Data', 'Entrou no grupo'],
    ...pessoas.value.map(l => [
      l.nome, l.numero, l.palavraChave, categorias.value.find(c => c.id === l.categoriaId)?.nome ?? 'Sem categoria',
      new Date(l.criadoEm).toLocaleString('pt-BR'), l.entrou ? 'Sim' : 'Não'
    ])
  ]
  const csv = linhas.map(c => c.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${periodo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.sucesso('Planilha baixada', `${pessoas.value.length} pessoas.`)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Leads</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">De onde vêm as pessoas que entram nos seus grupos.</p>
      </div>
      <!-- Período -->
      <div class="relative grid w-full shrink-0 animate-fade-up grid-cols-3 rounded-full bg-surface p-1 [animation-delay:80ms] sm:w-72">
        <span
          class="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-elevated shadow-card transition-transform duration-500 ease-spring"
          :style="{ transform: `translateX(${indicePeriodo * 100}%)` }"
        />
        <button
          v-for="p in PERIODOS"
          :key="p.valor"
          type="button"
          class="relative h-9 rounded-full text-label font-semibold transition-colors"
          :class="periodo === p.valor ? 'text-fg' : 'text-muted'"
          @click="periodo = p.valor"
        >{{ p.rotulo }}</button>
      </div>
    </header>

    <!-- Números -->
    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <UiCard v-for="(n, i) in NUMEROS" :key="n.rotulo" class="animate-fade-up p-4" :style="{ animationDelay: `${120 + i * 50}ms` }">
        <div class="flex items-center justify-between text-muted">
          <span class="text-label">{{ n.rotulo }}</span>
          <UiIcone :nome="n.icone" :tamanho="16" />
        </div>
        <p class="mt-2 text-[28px] font-semibold leading-9"><UiContador :valor="n.valor" /></p>
        <p class="mt-1 text-[12px] text-muted">{{ n.nota }}</p>
      </UiCard>
    </section>

    <!-- Gráficos -->
    <section class="grid gap-3 lg:grid-cols-2">
      <UiCard v-reveal class="p-5">
        <p class="font-semibold">De onde vêm os cliques</p>
        <p class="mb-5 text-label text-muted">Pela origem no link (ex.: <span class="font-mono">/g/casa-cozinha?src=instagram</span>)</p>
        <UiBarras :itens="origens" unidade="cliques" />
      </UiCard>
      <UiCard v-reveal="80" class="p-5">
        <p class="font-semibold">Cliques por categoria</p>
        <p class="mb-5 text-label text-muted">Qual link de entrada mais atrai gente.</p>
        <UiBarras :itens="porCategoria" unidade="cliques" />
      </UiCard>
    </section>

    <!-- Pessoas -->
    <section>
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 class="font-semibold">Pediram o convite</h2>
          <p class="text-label text-muted">Mandaram a palavra-chave e receberam o link do grupo.</p>
        </div>
        <UiBotao variante="secundario" tamanho="sm" class="shrink-0" :disabled="!pessoas.length" @click="exportar">
          <UiIcone nome="baixar" :tamanho="16" /> <span class="hidden sm:inline">Planilha</span>
        </UiBotao>
      </div>

      <UiCard v-if="pessoas.length" class="overflow-hidden">
        <TransitionGroup tag="div" name="lista" class="divide-y divide-line">
          <div v-for="l in pessoas" :key="l.id" class="flex items-center gap-3 p-4">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-label font-semibold">{{ l.nome[0] }}</span>
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2">
                <span class="truncate font-semibold">{{ l.nome }}</span>
                <span v-if="l.entrou" class="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-whatsapp/15 px-1.5 text-[11px] font-semibold">
                  <UiIcone nome="check" :tamanho="10" :traco="3" /> Entrou
                </span>
              </p>
              <p class="truncate text-label text-muted">{{ l.numero }}</p>
              <p class="truncate text-[12px] text-muted">"{{ l.palavraChave }}" · {{ nomeCategoria(l.categoriaId) }} · {{ tempoRelativo(l.criadoEm) }}</p>
            </div>
            <a
              :href="conversa(l)"
              target="_blank"
              rel="noopener"
              class="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-surface hover:text-fg"
              :aria-label="`Abrir conversa com ${l.nome}`"
            >
              <UiIcone nome="mensagem" :tamanho="16" />
            </a>
          </div>
        </TransitionGroup>
      </UiCard>
      <UiCard v-else class="flex flex-col items-center gap-2 p-8 text-center">
        <span class="flex size-12 items-center justify-center rounded-full bg-surface"><UiIcone nome="mensagem" :tamanho="20" /></span>
        <p class="font-semibold">Ninguém pediu {{ periodo === 'hoje' ? 'hoje' : 'nesse período' }}</p>
        <p class="max-w-xs text-label text-muted">Divulgue "Manda QUERO CASA no meu WhatsApp" nos stories para as pessoas pedirem o convite.</p>
      </UiCard>

      <p class="mt-3 flex items-start gap-2 text-[12px] text-muted">
        <UiIcone nome="cadeado" :tamanho="14" class="mt-0.5 shrink-0" />
        Aqui só aparece quem mandou mensagem pedindo o convite. Use esses números só para o que a pessoa pediu (LGPD).
      </p>
    </section>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .4s cubic-bezier(.22, 1, .36, 1); }
.lista-leave-active { transition: opacity .15s ease; }
.lista-enter-from { opacity: 0; transform: translateY(-6px); }
.lista-leave-to { opacity: 0; }
</style>
