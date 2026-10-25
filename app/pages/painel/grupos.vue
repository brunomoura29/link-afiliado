<script setup lang="ts">
import type { Grupo } from '~/composables/useGrupos'

// Os grupos do WhatsApp. Cada grupo fica em UMA categoria (escolhida aqui ou na página
// da categoria). Rotação e link de entrada ficam na página da categoria; "novo grupo"
// existe nas duas (aqui é preciso escolher a categoria).
definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Grupos · LinkAfiliado' })

const toast = useToast()
const { disparar } = useConfete()
const { conectado } = useWhatsapp()
const {
  categorias, grupos, sincronizar, definirCategoria, definirOfertas, buscarConvite, novoConvite,
  proximoNomeGrupo, criarGrupo
} = useGrupos()

const categoriaDe = (g: Grupo) => categorias.value.find(c => c.id === g.categoriaId)

// Filtros: busca, categoria e "só onde sou admin" (grupos de família/trabalho ficam ocultos)
const busca = ref('')
const filtroCategoria = ref('') // '' = todas | 'sem' = sem categoria | id
const mostrarTodos = ref(false)
const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const util = (g: Grupo) => g.admin && g.podeEnviar

const opcoesFiltro = computed(() => [
  { valor: '', rotulo: 'Todas as categorias' },
  { valor: 'sem', rotulo: 'Sem categoria' },
  ...categorias.value.map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` }))
])

const filtrados = computed(() => grupos.value
  .filter(g => !busca.value || normalizar(g.nome).includes(normalizar(busca.value)))
  .filter(g => !filtroCategoria.value || (filtroCategoria.value === 'sem' ? !g.categoriaId : g.categoriaId === filtroCategoria.value))
  // Já organizados aparecem primeiro; depois os maiores
  .sort((a, b) => Number(!a.categoriaId) - Number(!b.categoriaId) || b.membros - a.membros))
// Grupo com categoria sempre aparece; sem categoria só se for útil (ou "mostrar todos"/busca)
const visiveis = computed(() => mostrarTodos.value || busca.value
  ? filtrados.value
  : filtrados.value.filter(g => g.categoriaId || util(g)))
const ocultos = computed(() => filtrados.value.length - visiveis.value.length)

const comoAdmin = computed(() => grupos.value.filter(g => g.admin).length)
const organizados = computed(() => grupos.value.filter(g => g.categoriaId).length)
const recebendo = computed(() => grupos.value.filter(g => g.categoriaId && g.recebeOfertas).length)

// Atualizar a lista a partir do WhatsApp
const sincronizando = ref(false)
async function atualizar() {
  sincronizando.value = true
  const r = await sincronizar()
  sincronizando.value = false
  if (!r) return
  const extras = [r.novos && `${r.novos} novos`, r.removidos && `${r.removidos} removidos`].filter(Boolean).join(', ')
  toast.sucesso('Grupos atualizados', `Encontramos ${r.total} grupos no seu WhatsApp${extras ? ` (${extras})` : ''}.`)
}

// Detalhes do grupo: categoria, receber ofertas, convite
const selecionado = ref<Grupo | null>(null)
const detalhesAberto = computed({ get: () => !!selecionado.value, set: v => !v && (selecionado.value = null) })
const opcoesCategoria = computed(() => [
  ...categorias.value.map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}${c.recebeTodas ? ' (recebe tudo)' : ''}` })),
  { valor: '', rotulo: 'Sem categoria' }
])
const categoriaSelecionada = computed({
  get: () => selecionado.value?.categoriaId ?? '',
  set: (v: string) => selecionado.value && definirCategoria(selecionado.value, v || null)
})

const copiado = ref(false)
async function copiarConvite(url: string) {
  try { await navigator.clipboard.writeText(url) } catch {}
  copiado.value = true
  toast.sucesso('Convite copiado')
  setTimeout(() => (copiado.value = false), 1500)
}
const confirmarConvite = ref(false)
const gerandoConvite = ref(false)
watch(selecionado, () => (confirmarConvite.value = false))
async function gerarConvite() {
  if (!selecionado.value) return
  gerandoConvite.value = true
  const convite = await novoConvite(selecionado.value)
  gerandoConvite.value = false
  confirmarConvite.value = false
  if (convite) toast.sucesso('Novo convite gerado', 'O link de entrada da categoria continua o mesmo.')
}

const buscandoConvite = ref(false)
async function buscarConviteSelecionado() {
  if (!selecionado.value) return
  buscandoConvite.value = true
  await buscarConvite(selecionado.value)
  buscandoConvite.value = false
}

// Novo grupo: criado no WhatsApp já numa categoria (sem categoria não entra na rotação)
const novoAberto = ref(false)
const categoriaNovo = ref('')
const nomeNovo = ref('')
const soAdminsNovo = ref(true)
const erroCategoria = ref('')
const erroNome = ref('')
const criando = ref(false)
const criado = ref(false)
const botaoCriar = ref<{ $el: HTMLElement }>()
const opcoesCategoriaNovo = computed(() => categorias.value.map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` })))
watch(nomeNovo, () => (erroNome.value = ''))
// Sugere o nome e o "só admins" da categoria escolhida
function sugerir(id: string) {
  erroCategoria.value = ''
  const c = categorias.value.find(x => x.id === id)
  nomeNovo.value = c ? proximoNomeGrupo(c) : ''
  soAdminsNovo.value = c?.soAdmins ?? true
}
watch(categoriaNovo, sugerir)
function abrirNovo() {
  // Com uma categoria só (ou filtrando por uma), ela já vem escolhida
  const filtrada = categorias.value.find(c => c.id === filtroCategoria.value)
  categoriaNovo.value = filtrada?.id ?? (categorias.value.length === 1 ? categorias.value[0]!.id : '')
  sugerir(categoriaNovo.value)
  criado.value = false
  novoAberto.value = true
}
async function criarNovo() {
  const c = categorias.value.find(x => x.id === categoriaNovo.value)
  if (!c) {
    erroCategoria.value = 'Escolha a categoria do grupo'
    return
  }
  if (nomeNovo.value.trim().length < 2) {
    erroNome.value = 'Dê um nome para o grupo'
    return
  }
  criando.value = true
  const g = await criarGrupo(c, nomeNovo.value, soAdminsNovo.value)
  criando.value = false
  if (!g) return
  criado.value = true
  disparar(botaoCriar.value?.$el ?? null)
  toast.sucesso('Grupo criado no WhatsApp', `${g.nome} entrou no fim da ordem de ${c.nome}.`)
  setTimeout(() => (novoAberto.value = false), 700)
}

const botaoIcone = 'flex size-9 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95'
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Grupos</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Os grupos do seu WhatsApp. Escolha a categoria de cada um.</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <UiBotao variante="secundario" tamanho="sm" :disabled="!conectado || sincronizando" @click="atualizar">
          <UiIcone nome="atualizar" :tamanho="16" :class="sincronizando && 'animate-spin'" />
          <span class="hidden sm:inline">Atualizar</span>
        </UiBotao>
        <UiBotao tamanho="sm" :disabled="!conectado" @click="abrirNovo">
          <UiIcone nome="usuarios" :tamanho="16" />
          <span class="hidden sm:inline">Novo grupo</span>
        </UiBotao>
      </div>
    </header>

    <!-- Sem WhatsApp -->
    <NuxtLink
      v-if="!conectado"
      to="/painel/whatsapp"
      class="flex animate-fade-up items-center gap-3 rounded-lg border border-status-rejeitada/40 bg-status-rejeitada/5 p-4"
    >
      <UiIcone nome="alerta" class="text-status-rejeitada" />
      <span class="flex-1 text-label">
        <span class="block font-semibold">WhatsApp desconectado</span>
        <span class="text-muted">A lista pode estar desatualizada e nada é enviado. Toque para conectar.</span>
      </span>
      <UiIcone nome="seta-direita" :tamanho="18" class="text-muted" />
    </NuxtLink>

    <!-- Resumo -->
    <div class="flex animate-fade-up flex-wrap gap-2 [animation-delay:100ms]">
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ grupos.length }}</strong> <span class="text-muted">grupos</span></span>
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ comoAdmin }}</strong> <span class="text-muted">em que você é admin</span></span>
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ organizados }}</strong> <span class="text-muted">com categoria</span></span>
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ recebendo }}</strong> <span class="text-muted">recebendo ofertas</span></span>
    </div>

    <!-- Filtros -->
    <div class="grid animate-fade-up gap-3 [animation-delay:140ms] sm:grid-cols-[1fr_240px]">
      <UiCampo v-model="busca" rotulo="Buscar grupo">
        <template #fim>
          <button v-if="busca" type="button" aria-label="Limpar busca" class="flex size-8 items-center justify-center rounded text-muted hover:text-fg" @click="busca = ''">
            <UiIcone nome="x" :tamanho="16" />
          </button>
        </template>
      </UiCampo>
      <UiSelecao v-model="filtroCategoria" rotulo="Categoria" :opcoes="opcoesFiltro" />
    </div>

    <!-- Vazio: nunca sincronizou -->
    <UiCard v-if="!grupos.length" class="flex flex-col items-center gap-3 p-8 text-center">
      <span class="flex size-14 items-center justify-center rounded-full bg-surface"><UiIcone nome="usuarios" :tamanho="24" /></span>
      <p class="font-semibold">Nenhum grupo ainda</p>
      <p class="max-w-xs text-label text-muted">Toque em Atualizar para buscar os grupos do seu WhatsApp.</p>
      <UiBotao :disabled="!conectado || sincronizando" @click="atualizar">
        <UiIcone nome="atualizar" :tamanho="16" :class="sincronizando && 'animate-spin'" /> Buscar grupos
      </UiBotao>
    </UiCard>

    <!-- Lista -->
    <section v-else>
      <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p class="text-label text-muted">
          {{ visiveis.length }} {{ visiveis.length === 1 ? 'grupo' : 'grupos' }}
          <template v-if="!mostrarTodos && !busca"> · os sem categoria aparecem só se você for admin</template>
        </p>
        <button
          v-if="!busca && (ocultos || mostrarTodos)"
          type="button"
          class="text-label font-semibold text-muted underline decoration-line underline-offset-4 transition-colors hover:text-fg"
          @click="mostrarTodos = !mostrarTodos"
        >
          {{ mostrarTodos ? 'Mostrar só onde sou admin' : `Mostrar todos (+${ocultos} ocultos)` }}
        </button>
      </div>
      <UiCard v-if="visiveis.length" class="divide-y divide-line overflow-hidden">
        <GruposLinha
          v-for="g in visiveis"
          :key="g.id"
          :grupo="g"
          :categoria="categoriaDe(g)"
          :sem-categoria="!g.categoriaId"
          @abrir="selecionado = g"
          @ofertas="definirOfertas(g, $event)"
        />
      </UiCard>
      <UiCard v-else class="p-4 text-label text-muted">Nenhum grupo com esses filtros.</UiCard>
    </section>

    <!-- Detalhes do grupo -->
    <UiDialogo
      v-model="detalhesAberto"
      :titulo="selecionado?.nome ?? ''"
      :descricao="selecionado ? `${selecionado.membros.toLocaleString('pt-BR')} de ${selecionado.capacidade.toLocaleString('pt-BR')} membros` : ''"
    >
      <div v-if="selecionado" class="flex flex-col gap-5">
        <p v-if="!selecionado.podeEnviar" class="flex items-start gap-2 rounded bg-status-rejeitada/5 p-3 text-label text-status-rejeitada">
          <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0" />
          O número conectado não consegue mandar mensagem neste grupo. Ofertas não chegam aqui.
        </p>
        <p v-else-if="!selecionado.admin" class="flex items-start gap-2 rounded bg-surface p-3 text-label">
          <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
          <span>
            O número conectado <strong>não é admin</strong> deste grupo. As ofertas podem ser enviadas, mas ele não entra
            na rotação do link de entrada (precisa do convite).
          </span>
        </p>

        <UiSelecao v-model="categoriaSelecionada" rotulo="Categoria" :opcoes="opcoesCategoria" />

        <UiInterruptor
          v-if="selecionado.categoriaId"
          :model-value="selecionado.recebeOfertas"
          rotulo="Enviar ofertas para este grupo"
          descricao="Desligue para pausar só este grupo."
          @update:model-value="definirOfertas(selecionado, $event)"
        />

        <NuxtLink
          v-if="selecionado.categoriaId"
          :to="`/painel/categorias/${selecionado.categoriaId}`"
          class="flex items-center justify-between gap-2 rounded border border-line p-3 text-label transition-colors hover:bg-surface"
        >
          <span>Ordem de entrada e link da categoria</span>
          <UiIcone nome="seta-direita" :tamanho="16" class="text-muted" />
        </NuxtLink>

        <div v-if="selecionado.admin" class="flex flex-col gap-2">
          <p>Convite direto do grupo</p>
          <div class="flex items-center gap-1 rounded bg-surface p-1 pl-3">
            <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ selecionado.convite?.replace('https://', '') ?? 'Sem convite ainda' }}</span>
            <button v-if="selecionado.convite" type="button" :class="botaoIcone" aria-label="Copiar convite" @click="copiarConvite(selecionado.convite)">
              <UiIcone :nome="copiado ? 'check' : 'copiar'" :tamanho="16" />
            </button>
            <UiBotao v-else tamanho="sm" variante="secundario" :carregando="buscandoConvite" :disabled="!conectado" @click="buscarConviteSelecionado">
              Buscar
              <template #carregando>Buscando…</template>
            </UiBotao>
          </div>
          <Transition v-if="selecionado.convite" name="troca" mode="out-in">
            <div v-if="confirmarConvite" key="c" class="flex flex-col gap-2 rounded border border-line p-3">
              <p class="text-label">O convite atual para de funcionar. O link de entrada da categoria continua funcionando normalmente.</p>
              <div class="flex gap-2">
                <UiBotao tamanho="sm" variante="perigo" :carregando="gerandoConvite" @click="gerarConvite">
                  Gerar novo
                  <template #carregando>Gerando…</template>
                </UiBotao>
                <UiBotao tamanho="sm" variante="fantasma" :disabled="gerandoConvite" @click="confirmarConvite = false">Cancelar</UiBotao>
              </div>
            </div>
            <button v-else key="b" type="button" class="self-start text-label font-semibold text-muted underline decoration-line underline-offset-4 hover:text-fg" @click="confirmarConvite = true">
              Gerar novo convite (se o atual vazou)
            </button>
          </Transition>
        </div>
      </div>
      <template #acoes>
        <UiBotao variante="secundario" @click="detalhesAberto = false">Fechar</UiBotao>
      </template>
    </UiDialogo>

    <!-- Novo grupo -->
    <UiDialogo
      v-model="novoAberto"
      titulo="Novo grupo"
      descricao="Criado no seu WhatsApp, com o seu número como admin. As pessoas entram pelo link da categoria."
    >
      <div v-if="!categorias.length" class="flex flex-col gap-3">
        <p class="text-label text-muted">Crie uma categoria primeiro: é ela que dá o link de entrada e as ofertas que o grupo vai receber.</p>
        <UiBotao variante="secundario" tamanho="sm" class="self-start" @click="navigateTo('/painel/categorias')">Ir para Categorias</UiBotao>
      </div>
      <form v-else id="form-novo-grupo-lista" class="flex flex-col gap-5" novalidate @submit.prevent="criarNovo">
        <UiSelecao v-model="categoriaNovo" rotulo="Categoria" placeholder="Escolha a categoria" :opcoes="opcoesCategoriaNovo" :erro="erroCategoria" />
        <UiCampo v-model="nomeNovo" rotulo="Nome do grupo" :erro="erroNome" />
        <UiInterruptor v-model="soAdminsNovo" rotulo="Só admins enviam mensagens" descricao="Recomendado: o grupo fica só com as ofertas." />
        <p class="flex items-start gap-2 rounded bg-surface p-3 text-label text-muted">
          <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0" />
          Ele entra no fim da ordem de entrada da categoria. A descrição vem da categoria.
        </p>
      </form>
      <template #acoes>
        <UiBotao variante="secundario" :disabled="criando" @click="novoAberto = false">Cancelar</UiBotao>
        <UiBotao v-if="categorias.length" ref="botaoCriar" type="submit" form="form-novo-grupo-lista" :carregando="criando" :sucesso="criado">
          <UiIcone nome="usuarios" :tamanho="16" /> Criar grupo
          <template #carregando>Criando no WhatsApp…</template>
          <template #sucesso>Grupo criado!</template>
        </UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.troca-enter-active, .troca-leave-active { transition: opacity .2s ease, transform .2s ease; }
.troca-enter-from, .troca-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
