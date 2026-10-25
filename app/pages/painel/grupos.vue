<script setup lang="ts">
import type { CategoriaGrupo, Grupo } from '~/composables/useGrupos'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Grupos · LinkAfiliado' })

const toast = useToast()
const { conectado } = useWhatsapp()
const { disparar } = useConfete()
const {
  categorias, grupos, daCategoria, lotado, entradaAtiva, linkEntrada, sincronizar, definirCategoria, mover, novoConvite,
  proximoNomeGrupo, criarGrupo, definirOfertas
} = useGrupos()

// Busca
const busca = ref('')
const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const filtrar = (lista: Grupo[]) => busca.value ? lista.filter(g => normalizar(g.nome).includes(normalizar(busca.value))) : lista

const semCategoria = computed(() => filtrar(daCategoria(null)))
const totalMembros = computed(() => grupos.value.reduce((s, g) => s + g.membros, 0))
const recebendo = computed(() => grupos.value.filter(g => g.categoriaId && g.recebeOfertas).length)
const membrosDa = (c: CategoriaGrupo) => daCategoria(c.id).reduce((s, g) => s + g.membros, 0)

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

// Copiar / compartilhar
const copiado = ref('')
async function copiar(texto: string, chave: string) {
  try { await navigator.clipboard.writeText(texto) } catch {}
  copiado.value = chave
  toast.sucesso('Link copiado')
  setTimeout(() => copiado.value === chave && (copiado.value = ''), 1500)
}
async function compartilhar(c: CategoriaGrupo) {
  const url = linkEntrada(c)
  if (navigator.share) {
    try { await navigator.share({ title: `${c.emoji} ${c.nome}`, text: 'Entre no grupo de ofertas:', url }) } catch {}
  } else {
    copiar(url, c.id)
  }
}

// QR do link de entrada
const qrCategoria = ref<CategoriaGrupo | null>(null)
const qrAberto = computed({ get: () => !!qrCategoria.value, set: v => !v && (qrCategoria.value = null) })
const qr = ref<{ baixarPng: () => Promise<void> }>()

// Detalhes do grupo
const selecionado = ref<Grupo | null>(null)
const detalhesAberto = computed({ get: () => !!selecionado.value, set: v => !v && (selecionado.value = null) })
const opcoesCategoria = computed(() => [
  ...categorias.value.map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` })),
  { valor: '', rotulo: 'Sem categoria' }
])
const categoriaSelecionada = computed({
  get: () => selecionado.value?.categoriaId ?? '',
  set: (v: string) => selecionado.value && definirCategoria(selecionado.value, v || null)
})
const posicao = computed(() => {
  const g = selecionado.value
  if (!g?.categoriaId) return null
  const lista = daCategoria(g.categoriaId)
  return { atual: lista.findIndex(x => x.id === g.id) + 1, total: lista.length }
})

const confirmarConvite = ref(false)
const gerandoConvite = ref(false)
watch(selecionado, () => (confirmarConvite.value = false))
async function gerarConvite() {
  if (!selecionado.value) return
  gerandoConvite.value = true
  const convite = await novoConvite(selecionado.value)
  gerandoConvite.value = false
  confirmarConvite.value = false
  if (!convite) return
  toast.sucesso('Novo convite gerado', 'O link de entrada continua o mesmo.')
}

// Novo grupo (criado no WhatsApp pelo número conectado, já na categoria)
const categoriaNovoGrupo = ref<CategoriaGrupo | null>(null)
const novoGrupoAberto = computed({ get: () => !!categoriaNovoGrupo.value, set: v => !v && (categoriaNovoGrupo.value = null) })
const nomeNovoGrupo = ref('')
const soAdminsNovoGrupo = ref(true)
const erroNomeNovoGrupo = ref('')
const criandoGrupo = ref(false)
const grupoCriado = ref(false)
const recemCriado = ref<string | null>(null)
const botaoCriar = ref<{ $el: HTMLElement }>()
watch(nomeNovoGrupo, () => (erroNomeNovoGrupo.value = ''))

function abrirNovoGrupo(c: CategoriaGrupo) {
  categoriaNovoGrupo.value = c
  nomeNovoGrupo.value = proximoNomeGrupo(c)
  soAdminsNovoGrupo.value = c.soAdmins
  grupoCriado.value = false
}

async function criarNovoGrupo() {
  const c = categoriaNovoGrupo.value
  if (!c) return
  if (nomeNovoGrupo.value.trim().length < 2) {
    erroNomeNovoGrupo.value = 'Dê um nome para o grupo'
    return
  }
  criandoGrupo.value = true
  const g = await criarGrupo(c, nomeNovoGrupo.value, soAdminsNovoGrupo.value)
  criandoGrupo.value = false
  if (!g) return
  grupoCriado.value = true
  disparar(botaoCriar.value?.$el ?? null)
  toast.sucesso('Grupo criado no WhatsApp', `${g.nome} entrou no fim da fila do link de entrada.`)
  recemCriado.value = g.id
  setTimeout(() => (categoriaNovoGrupo.value = null), 700)
  setTimeout(() => recemCriado.value === g.id && (recemCriado.value = null), 3000)
}

const botaoIcone = 'flex size-9 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Grupos</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Escolha a categoria de cada grupo e divulgue o link de entrada.</p>
      </div>
      <UiBotao variante="secundario" tamanho="sm" class="shrink-0" :disabled="!conectado || sincronizando" @click="atualizar">
        <UiIcone nome="atualizar" :tamanho="16" :class="sincronizando && 'animate-spin'" />
        <span class="hidden sm:inline">Atualizar</span>
      </UiBotao>
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
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ totalMembros.toLocaleString('pt-BR') }}</strong> <span class="text-muted">membros</span></span>
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ recebendo }}</strong> <span class="text-muted">recebendo ofertas</span></span>
    </div>

    <div class="animate-fade-up [animation-delay:140ms]">
      <UiCampo v-model="busca" rotulo="Buscar grupo">
        <template #fim>
          <button v-if="busca" type="button" aria-label="Limpar busca" class="flex size-8 items-center justify-center rounded text-muted hover:text-fg" @click="busca = ''">
            <UiIcone nome="x" :tamanho="16" />
          </button>
        </template>
      </UiCampo>
    </div>

    <!-- Por categoria -->
    <section v-for="(c, ci) in categorias" :key="c.id" v-reveal="ci * 60">
      <UiCard class="overflow-hidden">
        <div class="flex flex-col gap-3 border-b border-line p-4">
          <div class="flex items-center gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded bg-surface text-[20px]">{{ c.emoji }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ c.nome }}</p>
              <p class="text-label text-muted">{{ daCategoria(c.id).length }} grupos · {{ membrosDa(c).toLocaleString('pt-BR') }} membros</p>
            </div>
          </div>

          <!-- Link de entrada -->
          <div class="flex items-center gap-1 rounded bg-surface p-1 pl-3">
            <UiIcone nome="link" :tamanho="14" class="shrink-0 text-muted" />
            <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ linkEntrada(c).replace('https://', '') }}</span>
            <button type="button" :class="botaoIcone" aria-label="Copiar link de entrada" @click="copiar(linkEntrada(c), c.id)">
              <UiIcone :nome="copiado === c.id ? 'check' : 'copiar'" :tamanho="16" />
            </button>
            <button type="button" :class="botaoIcone" aria-label="QR code do link" @click="qrCategoria = c">
              <UiIcone nome="qr" :tamanho="16" />
            </button>
            <button type="button" :class="botaoIcone" aria-label="Compartilhar link" @click="compartilhar(c)">
              <UiIcone nome="compartilhar" :tamanho="16" />
            </button>
          </div>

          <p v-if="!entradaAtiva(c.id)" class="flex items-start gap-2 rounded bg-status-rejeitada/5 p-3 text-label text-status-rejeitada">
            <UiIcone nome="alerta" :tamanho="16" class="mt-0.5 shrink-0" />
            Nenhum grupo com vaga e convite: quem abrir o link vai ver "grupo lotado".
          </p>
        </div>

        <TransitionGroup v-if="filtrar(daCategoria(c.id)).length" tag="div" name="lista" class="divide-y divide-line">
          <GruposLinha
            v-for="g in filtrar(daCategoria(c.id))"
            :key="g.id"
            :grupo="g"
            :posicao="daCategoria(c.id).indexOf(g) + 1"
            :entrada-ativa="entradaAtiva(c.id)?.id === g.id"
            :lotado="lotado(g)"
            :class="recemCriado === g.id && 'recem-criado'"
            @abrir="selecionado = g"
            @ofertas="definirOfertas(g, $event)"
          />
        </TransitionGroup>
        <p v-else class="p-4 text-label text-muted">{{ busca ? 'Nenhum grupo encontrado.' : 'Nenhum grupo nesta categoria ainda.' }}</p>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 border-t border-line p-3 text-label font-semibold text-muted transition-colors hover:bg-surface hover:text-fg disabled:pointer-events-none disabled:opacity-40"
          :disabled="!conectado"
          @click="abrirNovoGrupo(c)"
        >
          <span class="text-[18px] leading-none">+</span> Novo grupo
        </button>
      </UiCard>
    </section>

    <!-- Sem categoria -->
    <section v-if="semCategoria.length" v-reveal>
      <div class="mb-3">
        <h2 class="font-semibold">Sem categoria</h2>
        <p class="text-label text-muted">Esses grupos não recebem ofertas até você escolher uma categoria.</p>
      </div>
      <UiCard class="divide-y divide-line overflow-hidden">
        <GruposLinha v-for="g in semCategoria" :key="g.id" :grupo="g" sem-categoria @abrir="selecionado = g" />
      </UiCard>
    </section>

    <!-- Detalhes do grupo -->
    <UiDialogo
      v-model="detalhesAberto"
      :titulo="selecionado?.nome ?? ''"
      :descricao="selecionado ? `${selecionado.membros.toLocaleString('pt-BR')} de ${selecionado.capacidade.toLocaleString('pt-BR')} membros` : ''"
    >
      <div v-if="selecionado" class="flex flex-col gap-5">
        <p v-if="!selecionado.admin" class="flex items-start gap-2 rounded bg-surface p-3 text-label">
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
          @update:model-value="definirOfertas(selecionado, $event)"
          rotulo="Enviar ofertas para este grupo"
          descricao="Desligue para pausar só este grupo."
        />

        <div v-if="posicao" class="flex items-center justify-between gap-3">
          <div>
            <p>Ordem no link de entrada</p>
            <p class="text-label text-muted">{{ posicao.atual }}º de {{ posicao.total }} · quando um lota, o próximo assume</p>
          </div>
          <div class="flex gap-1">
            <button type="button" :class="botaoIcone" class="border border-line" aria-label="Subir na ordem" :disabled="posicao.atual === 1" @click="mover(selecionado, -1)">
              <UiIcone nome="seta-cima" :tamanho="16" />
            </button>
            <button type="button" :class="botaoIcone" class="border border-line" aria-label="Descer na ordem" :disabled="posicao.atual === posicao.total" @click="mover(selecionado, 1)">
              <UiIcone nome="seta" :tamanho="16" />
            </button>
          </div>
        </div>

        <div v-if="selecionado.admin" class="flex flex-col gap-2">
          <p>Convite direto do grupo</p>
          <div class="flex items-center gap-1 rounded bg-surface p-1 pl-3">
            <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ selecionado.convite?.replace('https://', '') ?? 'Sem convite' }}</span>
            <button v-if="selecionado.convite" type="button" :class="botaoIcone" aria-label="Copiar convite" @click="copiar(selecionado.convite, 'convite')">
              <UiIcone :nome="copiado === 'convite' ? 'check' : 'copiar'" :tamanho="16" />
            </button>
          </div>
          <Transition name="troca" mode="out-in">
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
      v-model="novoGrupoAberto"
      titulo="Novo grupo"
      :descricao="categoriaNovoGrupo ? `Criado no seu WhatsApp, já na categoria ${categoriaNovoGrupo.emoji} ${categoriaNovoGrupo.nome}, com o seu número como admin.` : ''"
    >
      <form v-if="categoriaNovoGrupo" id="form-novo-grupo" class="flex flex-col gap-5" novalidate @submit.prevent="criarNovoGrupo">
        <UiCampo v-model="nomeNovoGrupo" rotulo="Nome do grupo" :erro="erroNomeNovoGrupo" />
        <UiInterruptor v-model="soAdminsNovoGrupo" rotulo="Só admins enviam mensagens" descricao="Recomendado: o grupo fica só com as ofertas." />
        <p class="flex items-start gap-2 rounded bg-surface p-3 text-label text-muted">
          <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0" />
          Ele entra no fim da fila do link de entrada. Foto e descrição vêm da categoria.
        </p>
      </form>
      <template #acoes>
        <UiBotao variante="secundario" :disabled="criandoGrupo" @click="novoGrupoAberto = false">Cancelar</UiBotao>
        <UiBotao ref="botaoCriar" type="submit" form="form-novo-grupo" :carregando="criandoGrupo" :sucesso="grupoCriado">
          <UiIcone nome="usuarios" :tamanho="16" /> Criar grupo
          <template #carregando>Criando no WhatsApp…</template>
          <template #sucesso>Grupo criado!</template>
        </UiBotao>
      </template>
    </UiDialogo>

    <!-- QR do link de entrada -->
    <UiDialogo
      v-model="qrAberto"
      :titulo="qrCategoria ? `${qrCategoria.emoji} ${qrCategoria.nome}` : ''"
      descricao="Poste nos stories, na bio ou em material impresso. Quem escanear cai na página de entrada do grupo."
    >
      <div v-if="qrCategoria" class="flex flex-col items-center gap-3">
        <div class="w-full max-w-[240px]">
          <UiQrLink ref="qr" :url="linkEntrada(qrCategoria)" :nome-arquivo="`qr-${qrCategoria.slug}`" />
        </div>
        <p class="font-mono text-label text-muted">{{ linkEntrada(qrCategoria).replace('https://', '') }}</p>
      </div>
      <template #acoes>
        <UiBotao v-if="qrCategoria" variante="secundario" @click="compartilhar(qrCategoria)">
          <UiIcone nome="compartilhar" :tamanho="16" /> Compartilhar link
        </UiBotao>
        <UiBotao @click="qr?.baixarPng()">
          <UiIcone nome="baixar" :tamanho="16" /> Baixar imagem
        </UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .5s cubic-bezier(.34, 1.56, .64, 1); }
.lista-enter-from { opacity: 0; transform: translateY(-8px) scale(.98); }
.recem-criado { animation: destacar 3s ease-out; }
@keyframes destacar {
  0%, 30% { background-color: rgb(var(--whatsapp) / .18); }
  100% { background-color: transparent; }
}
.troca-enter-active, .troca-leave-active { transition: opacity .2s ease, transform .2s ease; }
.troca-enter-from, .troca-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
