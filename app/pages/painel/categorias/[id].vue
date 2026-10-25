<script setup lang="ts">
import type { Grupo } from '~/composables/useGrupos'

// Uma categoria: link de entrada, grupos na ordem de rotação, adicionar/criar grupos.
definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })

const rota = useRoute()
const toast = useToast()
const { disparar } = useConfete()
const { conectado } = useWhatsapp()
const {
  categorias, grupos, daCategoria, lotado, entradaAtiva, linkEntrada, definirCategoria, definirOfertas, mover,
  proximoNomeGrupo, criarGrupo
} = useGrupos()

const categoria = computed(() => categorias.value.find(c => c.id === rota.params.id))
useHead({ title: () => `${categoria.value?.nome ?? 'Categoria'} · LinkAfiliado` })

const lista = computed(() => categoria.value ? daCategoria(categoria.value.id) : [])
const ativo = computed(() => categoria.value ? entradaAtiva(categoria.value.id) : null)
const membros = computed(() => lista.value.reduce((s, g) => s + g.membros, 0))

// Editar
const editorAberto = ref(false)
watch(categoria, (c) => {
  if (!c) navigateTo('/painel/categorias') // excluída pelo editor
})

// Link de entrada
const copiado = ref(false)
async function copiar() {
  if (!categoria.value) return
  try { await navigator.clipboard.writeText(linkEntrada(categoria.value)) } catch {}
  copiado.value = true
  toast.sucesso('Link copiado')
  setTimeout(() => (copiado.value = false), 1500)
}
async function compartilhar() {
  const c = categoria.value
  if (!c) return
  if (navigator.share) {
    try { await navigator.share({ title: `${c.emoji} ${c.nome}`, text: 'Entre no grupo de ofertas:', url: linkEntrada(c) }) } catch {}
  } else copiar()
}
const qrAberto = ref(false)
const qr = ref<{ baixarPng: () => Promise<void> }>()

// Adicionar grupos que já existem (cada grupo fica em uma categoria só)
const adicionarAberto = ref(false)
const buscaAdicionar = ref('')
const marcados = ref<string[]>([])
const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const nomeCategoria = (id: string | null) => categorias.value.find(c => c.id === id)?.nome
const candidatos = computed(() => grupos.value
  .filter(g => g.categoriaId !== categoria.value?.id && g.admin && g.podeEnviar)
  .filter(g => !buscaAdicionar.value || normalizar(g.nome).includes(normalizar(buscaAdicionar.value)))
  .sort((a, b) => Number(!!a.categoriaId) - Number(!!b.categoriaId) || b.membros - a.membros))
function abrirAdicionar() {
  marcados.value = []
  buscaAdicionar.value = ''
  adicionarAberto.value = true
}
const adicionando = ref(false)
async function adicionar() {
  const c = categoria.value
  if (!c || !marcados.value.length) return
  adicionando.value = true
  for (const id of marcados.value) {
    const g = grupos.value.find(x => x.id === id)
    if (g) await definirCategoria(g, c.id)
  }
  adicionando.value = false
  adicionarAberto.value = false
  toast.sucesso(`${marcados.value.length} ${marcados.value.length === 1 ? 'grupo adicionado' : 'grupos adicionados'}`, 'Eles entram no fim da ordem de entrada.')
}

async function remover(g: Grupo) {
  await definirCategoria(g, null)
  toast.info('Grupo tirado da categoria', 'Ele não recebe mais as ofertas dela.')
}

// Novo grupo (criado no WhatsApp pelo número conectado, já na categoria)
const novoAberto = ref(false)
const nomeNovo = ref('')
const soAdminsNovo = ref(true)
const erroNome = ref('')
const criando = ref(false)
const criado = ref(false)
const recemCriado = ref<string | null>(null)
const botaoCriar = ref<{ $el: HTMLElement }>()
watch(nomeNovo, () => (erroNome.value = ''))
function abrirNovo() {
  if (!categoria.value) return
  nomeNovo.value = proximoNomeGrupo(categoria.value)
  soAdminsNovo.value = categoria.value.soAdmins
  criado.value = false
  novoAberto.value = true
}
async function criarNovo() {
  const c = categoria.value
  if (!c) return
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
  toast.sucesso('Grupo criado no WhatsApp', `${g.nome} entrou no fim da ordem de entrada.`)
  recemCriado.value = g.id
  setTimeout(() => (novoAberto.value = false), 700)
  setTimeout(() => recemCriado.value === g.id && (recemCriado.value = null), 3000)
}

const botaoIcone = 'flex size-9 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <div v-if="!categoria" class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
    <p class="text-title">Categoria não encontrada</p>
    <UiBotao variante="secundario" @click="navigateTo('/painel/categorias')">Voltar para Categorias</UiBotao>
  </div>

  <div v-else class="flex flex-col gap-6">
    <!-- Cabeçalho -->
    <header class="flex flex-col gap-4">
      <NuxtLink to="/painel/categorias" class="flex w-fit items-center gap-1 text-label font-semibold text-muted transition-colors hover:text-fg">
        <UiIcone nome="seta-direita" :tamanho="14" class="rotate-180" /> Categorias
      </NuxtLink>
      <div class="flex items-start gap-3">
        <span class="flex size-14 shrink-0 animate-pop items-center justify-center rounded-lg bg-surface text-[28px]">{{ categoria.emoji }}</span>
        <div class="min-w-0 flex-1">
          <h1 class="animate-fade-up truncate text-[26px] font-semibold leading-8 tracking-tight">{{ categoria.nome }}</h1>
          <p class="mt-1 flex animate-fade-up flex-wrap items-center gap-x-2 text-label text-muted [animation-delay:60ms]">
            <span>{{ lista.length }} {{ lista.length === 1 ? 'grupo' : 'grupos' }} · {{ membros.toLocaleString('pt-BR') }} membros</span>
            <span v-if="categoria.recebeTodas" class="inline-flex h-6 items-center gap-1 rounded-full bg-fg px-2 text-[12px] font-semibold text-bg">Recebe tudo</span>
            <span v-if="!categoria.ativa" class="inline-flex h-6 items-center rounded-full bg-surface px-2 text-[12px] font-semibold">Pausada</span>
          </p>
        </div>
        <UiBotao variante="secundario" tamanho="sm" class="shrink-0" @click="editorAberto = true">Editar</UiBotao>
      </div>
      <p v-if="categoria.recebeTodas" class="flex items-start gap-2 rounded bg-surface p-3 text-label">
        <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
        Os grupos desta categoria recebem as ofertas de <strong>todas</strong> as categorias.
      </p>
    </header>

    <!-- Link de entrada -->
    <section class="animate-fade-up [animation-delay:100ms]">
      <h2 class="mb-2 font-semibold">Link de entrada</h2>
      <UiCard class="flex flex-col gap-3 p-4">
        <div class="flex items-center gap-1 rounded bg-surface p-1 pl-3">
          <UiIcone nome="link" :tamanho="14" class="shrink-0 text-muted" />
          <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ linkEntrada(categoria).replace(/^https?:\/\//, '') }}</span>
          <button type="button" :class="botaoIcone" aria-label="Copiar link de entrada" @click="copiar">
            <UiIcone :nome="copiado ? 'check' : 'copiar'" :tamanho="16" />
          </button>
          <button type="button" :class="botaoIcone" aria-label="QR code do link" @click="qrAberto = true">
            <UiIcone nome="qr" :tamanho="16" />
          </button>
          <button type="button" :class="botaoIcone" aria-label="Compartilhar link" @click="compartilhar">
            <UiIcone nome="compartilhar" :tamanho="16" />
          </button>
        </div>
        <p v-if="ativo" class="flex items-center gap-2 text-label">
          <span class="size-2 shrink-0 animate-pulse rounded-full bg-whatsapp" />
          <span class="truncate text-muted">Quem clicar entra em <strong class="font-semibold text-fg">{{ ativo.nome }}</strong></span>
        </p>
        <p v-else class="flex items-start gap-2 rounded bg-status-rejeitada/5 p-3 text-label text-status-rejeitada">
          <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0" />
          Nenhum grupo com vaga e convite: quem abrir o link vai ver "grupo lotado" ou "em breve".
        </p>
      </UiCard>
    </section>

    <!-- Grupos na ordem de rotação -->
    <section class="animate-fade-up [animation-delay:150ms]">
      <div class="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 class="font-semibold">Grupos</h2>
          <p class="text-label text-muted">Na ordem de entrada: quando um lota, o próximo assume.</p>
        </div>
      </div>
      <UiCard class="overflow-hidden">
        <TransitionGroup v-if="lista.length" tag="div" name="lista" class="divide-y divide-line">
          <div v-for="(g, i) in lista" :key="g.id" class="flex items-center" :class="recemCriado === g.id && 'recem-criado'">
            <GruposLinha
              class="min-w-0 flex-1"
              :grupo="g"
              :posicao="i + 1"
              :entrada-ativa="ativo?.id === g.id"
              :lotado="lotado(g)"
              @abrir="() => {}"
              @ofertas="definirOfertas(g, $event)"
            />
            <div class="flex shrink-0 flex-col gap-1 pr-3">
              <button type="button" :class="botaoIcone" class="!size-8" aria-label="Subir na ordem" :disabled="i === 0" @click="mover(g, -1)">
                <UiIcone nome="seta-cima" :tamanho="15" />
              </button>
              <button type="button" :class="botaoIcone" class="!size-8" aria-label="Descer na ordem" :disabled="i === lista.length - 1" @click="mover(g, 1)">
                <UiIcone nome="seta" :tamanho="15" />
              </button>
            </div>
            <button type="button" :class="botaoIcone" class="mr-2" :aria-label="`Tirar ${g.nome} da categoria`" @click="remover(g)">
              <UiIcone nome="x" :tamanho="16" />
            </button>
          </div>
        </TransitionGroup>
        <p v-else class="p-4 text-label text-muted">Nenhum grupo nesta categoria ainda. Adicione um grupo que você já tem ou crie um novo.</p>

        <div class="grid grid-cols-2 divide-x divide-line border-t border-line">
          <button
            type="button"
            class="flex items-center justify-center gap-2 p-3 text-label font-semibold text-muted transition-colors hover:bg-surface hover:text-fg"
            @click="abrirAdicionar"
          >
            <span class="text-[18px] leading-none">+</span> Adicionar grupos
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 p-3 text-label font-semibold text-muted transition-colors hover:bg-surface hover:text-fg disabled:pointer-events-none disabled:opacity-40"
            :disabled="!conectado"
            @click="abrirNovo"
          >
            <UiIcone nome="usuarios" :tamanho="16" /> Novo grupo
          </button>
        </div>
      </UiCard>
    </section>

    <!-- Editar categoria -->
    <UiDialogo v-model="editorAberto" titulo="Editar categoria" largura="larga">
      <CategoriasEditor v-if="editorAberto" :key="categoria.id" :categoria="categoria" @fechar="editorAberto = false" />
    </UiDialogo>

    <!-- Adicionar grupos -->
    <UiDialogo
      v-model="adicionarAberto"
      titulo="Adicionar grupos"
      descricao="Grupos em que você é admin. Cada grupo fica em uma categoria só: se ele estiver em outra, muda para esta."
      largura="larga"
    >
      <div class="flex flex-col gap-3">
        <UiCampo v-model="buscaAdicionar" rotulo="Buscar grupo" />
        <ul v-if="candidatos.length" class="flex flex-col divide-y divide-line rounded border border-line">
          <li v-for="g in candidatos" :key="g.id">
            <label class="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-surface">
              <input v-model="marcados" type="checkbox" :value="g.id" class="size-5 shrink-0 accent-[rgb(var(--fg))]">
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ g.nome }}</span>
                <span class="block text-[12px] text-muted">
                  {{ g.membros.toLocaleString('pt-BR') }} membros{{ g.categoriaId ? ` · hoje em ${nomeCategoria(g.categoriaId)}` : '' }}
                </span>
              </span>
            </label>
          </li>
        </ul>
        <p v-else class="text-label text-muted">
          Nenhum grupo disponível. Em Grupos, toque em Atualizar para buscar os grupos do seu WhatsApp.
        </p>
      </div>
      <template #acoes>
        <UiBotao variante="secundario" :disabled="adicionando" @click="adicionarAberto = false">Cancelar</UiBotao>
        <UiBotao :disabled="!marcados.length" :carregando="adicionando" @click="adicionar">
          Adicionar{{ marcados.length ? ` (${marcados.length})` : '' }}
          <template #carregando>Adicionando…</template>
        </UiBotao>
      </template>
    </UiDialogo>

    <!-- Novo grupo -->
    <UiDialogo
      v-model="novoAberto"
      titulo="Novo grupo"
      :descricao="`Criado no seu WhatsApp, já em ${categoria.emoji} ${categoria.nome}, com o seu número como admin.`"
    >
      <form id="form-novo-grupo" class="flex flex-col gap-5" novalidate @submit.prevent="criarNovo">
        <UiCampo v-model="nomeNovo" rotulo="Nome do grupo" :erro="erroNome" />
        <UiInterruptor v-model="soAdminsNovo" rotulo="Só admins enviam mensagens" descricao="Recomendado: o grupo fica só com as ofertas." />
        <p class="flex items-start gap-2 rounded bg-surface p-3 text-label text-muted">
          <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0" />
          Ele entra no fim da ordem de entrada. A descrição vem da categoria.
        </p>
      </form>
      <template #acoes>
        <UiBotao variante="secundario" :disabled="criando" @click="novoAberto = false">Cancelar</UiBotao>
        <UiBotao ref="botaoCriar" type="submit" form="form-novo-grupo" :carregando="criando" :sucesso="criado">
          <UiIcone nome="usuarios" :tamanho="16" /> Criar grupo
          <template #carregando>Criando no WhatsApp…</template>
          <template #sucesso>Grupo criado!</template>
        </UiBotao>
      </template>
    </UiDialogo>

    <!-- QR do link de entrada -->
    <UiDialogo
      v-model="qrAberto"
      :titulo="`${categoria.emoji} ${categoria.nome}`"
      descricao="Poste nos stories, na bio ou em material impresso. Quem escanear cai na página de entrada do grupo."
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-full max-w-[240px]">
          <UiQrLink ref="qr" :url="linkEntrada(categoria)" :nome-arquivo="`qr-${categoria.slug}`" />
        </div>
        <p class="font-mono text-label text-muted">{{ linkEntrada(categoria).replace(/^https?:\/\//, '') }}</p>
      </div>
      <template #acoes>
        <UiBotao variante="secundario" @click="compartilhar"><UiIcone nome="compartilhar" :tamanho="16" /> Compartilhar link</UiBotao>
        <UiBotao @click="qr?.baixarPng()"><UiIcone nome="baixar" :tamanho="16" /> Baixar imagem</UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .5s cubic-bezier(.34, 1.56, .64, 1); }
.lista-enter-from { opacity: 0; transform: translateY(-8px) scale(.98); }
.lista-move { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
.recem-criado { animation: destacar 3s ease-out; }
@keyframes destacar {
  0%, 30% { background-color: rgb(var(--whatsapp) / .18); }
  100% { background-color: transparent; }
}
</style>
