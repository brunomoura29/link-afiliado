<script setup lang="ts">
import type { LinkFormulario } from '~/composables/useLinks'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Links · LinkAfiliado' })

const toast = useToast()
const { disparar } = useConfete()
const { links, urlDo, carregar, criar, atualizar, regenerar, excluir } = useLinks()
await useAsyncData('links-formulario', carregar)

const falhou = () => toast.erro('Não foi possível salvar', 'Verifique sua internet e tente de novo.')

const ativos = computed(() => links.value.filter(l => l.ativo).length)
const iniciais = (nome: string) => nome.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()

// Copiar / compartilhar
const copiado = ref('')
async function copiar(l: LinkFormulario) {
  try { await navigator.clipboard.writeText(urlDo(l)) } catch {}
  copiado.value = l.id
  toast.sucesso('Link copiado')
  setTimeout(() => copiado.value === l.id && (copiado.value = ''), 1500)
}
const mensagemConvite = (l: LinkFormulario) =>
  `Oi! Use este link para cadastrar as ofertas (não precisa de login): ${urlDo(l)}`
function enviarWhatsapp(l: LinkFormulario) {
  window.open(`https://wa.me/?text=${encodeURIComponent(mensagemConvite(l))}`, '_blank')
}

// QR
const qrLink = ref<LinkFormulario | null>(null)
const qrAberto = computed({ get: () => !!qrLink.value, set: v => !v && (qrLink.value = null) })
const qr = ref<{ baixarPng: () => Promise<void> }>()

// Novo link
const novoAberto = ref(false)
const nomeNovo = ref('')
const erroNome = ref('')
const criando = ref(false)
const criado = ref<LinkFormulario | null>(null)
const botaoCriar = ref<{ $el: HTMLElement }>()
watch(nomeNovo, () => (erroNome.value = ''))
function abrirNovo() {
  nomeNovo.value = ''
  criado.value = null
  novoAberto.value = true
}
async function criarLink() {
  if (nomeNovo.value.trim().length < 2) {
    erroNome.value = 'Dê um nome para saber quem usa o link'
    return
  }
  criando.value = true
  let l: LinkFormulario
  try {
    l = await criar(nomeNovo.value)
  } catch {
    criando.value = false
    return falhou()
  }
  criando.value = false
  disparar(botaoCriar.value?.$el ?? null)
  criado.value = l
}

// Detalhes
const selecionado = ref<LinkFormulario | null>(null)
const detalhesAberto = computed({ get: () => !!selecionado.value, set: v => !v && (selecionado.value = null) })
const confirmando = ref<'regenerar' | 'excluir' | null>(null)
const processando = ref(false)
// Nome é editado num rascunho e salvo ao sair do campo
const nomeEdicao = ref('')
watch(selecionado, (l) => {
  confirmando.value = null
  nomeEdicao.value = l?.nome ?? ''
})
async function salvarNome() {
  const l = selecionado.value
  const nome = nomeEdicao.value.trim()
  if (!l || nome === l.nome) return
  if (nome.length < 2) {
    nomeEdicao.value = l.nome
    return
  }
  try {
    await atualizar(l, { nome })
    toast.sucesso('Nome salvo')
  } catch {
    nomeEdicao.value = l.nome
    falhou()
  }
}
async function alternarAtivo(ativo: boolean) {
  const l = selecionado.value
  if (!l) return
  try {
    await atualizar(l, { ativo })
    toast.info(ativo ? 'Link reativado' : 'Link desativado', ativo ? 'Quem tem o link volta a conseguir enviar.' : 'Quem tem o link não consegue mais enviar ofertas.')
  } catch {
    falhou()
  }
}
async function confirmar() {
  const l = selecionado.value
  if (!l || !confirmando.value) return
  processando.value = true
  try {
    if (confirmando.value === 'regenerar') {
      await regenerar(l)
      toast.sucesso('Link novo gerado', 'O antigo parou de funcionar. Mande o novo para o assistente.')
    } else {
      await excluir(l)
      toast.info('Link excluído')
      selecionado.value = null
    }
  } catch {
    falhou()
  }
  processando.value = false
  confirmando.value = null
}

const botaoIcone = 'flex size-9 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Links do formulário</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Mande para quem vai cadastrar as ofertas. Não precisa de login.</p>
      </div>
      <UiBotao tamanho="sm" class="shrink-0" @click="abrirNovo">
        <span class="text-[18px] leading-none">+</span> Novo
      </UiBotao>
    </header>

    <div class="flex animate-fade-up flex-wrap gap-2 [animation-delay:100ms]">
      <span class="rounded-full border border-line px-3 py-1 text-label"><strong>{{ ativos }}</strong> <span class="text-muted">ativos</span></span>
      <span class="rounded-full border border-line px-3 py-1 text-label">
        <strong>{{ links.reduce((s, l) => s + l.ofertasHoje, 0) }}</strong> <span class="text-muted">ofertas hoje pelos links</span>
      </span>
    </div>

    <!-- Vazio -->
    <UiCard v-if="!links.length" class="flex animate-fade-up flex-col items-center gap-3 p-8 text-center">
      <span class="flex size-14 items-center justify-center rounded-full bg-surface"><UiIcone nome="link" :tamanho="24" /></span>
      <p class="font-semibold">Nenhum link ainda</p>
      <p class="max-w-xs text-label text-muted">Crie um link para cada pessoa que vai cadastrar ofertas. Assim você sabe quem enviou o quê.</p>
      <UiBotao @click="abrirNovo">Criar o primeiro</UiBotao>
    </UiCard>

    <TransitionGroup v-else tag="div" name="lista" class="grid auto-rows-fr gap-3 lg:grid-cols-2">
      <UiCard v-for="(l, i) in links" :key="l.id" v-reveal="i * 60" class="flex h-full flex-col" :class="!l.ativo && 'opacity-60'">
        <button type="button" class="flex items-center gap-3 p-4 pb-3 text-left" @click="selecionado = l">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-label font-semibold">{{ iniciais(l.nome) }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ l.nome }}</span>
            <span class="block text-label text-muted">Último uso {{ tempoRelativo(l.ultimoUso) }}</span>
          </span>
          <span
            class="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold"
            :class="l.ativo ? 'bg-status-aprovada/10 text-status-aprovada' : 'bg-surface text-muted'"
          >
            <span class="size-1.5 rounded-full" :class="l.ativo ? 'bg-status-aprovada' : 'bg-status-pendente'" />
            {{ l.ativo ? 'Ativo' : 'Desativado' }}
          </span>
        </button>

        <div class="mx-4 flex items-center gap-1 rounded bg-surface p-1 pl-3">
          <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ urlDo(l).replace('https://', '') }}</span>
          <button type="button" :class="botaoIcone" aria-label="Copiar link" :disabled="!l.ativo" @click="copiar(l)">
            <UiIcone :nome="copiado === l.id ? 'check' : 'copiar'" :tamanho="16" />
          </button>
          <button type="button" :class="botaoIcone" aria-label="QR code do link" :disabled="!l.ativo" @click="qrLink = l">
            <UiIcone nome="qr" :tamanho="16" />
          </button>
        </div>

        <div class="mt-auto flex items-center justify-between gap-3 p-4 pt-3">
          <p class="text-label text-muted">
            <strong class="font-semibold text-fg">{{ l.ofertasTotal }}</strong> ofertas
            <template v-if="l.ofertasHoje"> · <strong class="font-semibold text-fg">{{ l.ofertasHoje }}</strong> hoje</template>
          </p>
          <UiBotao v-if="l.ativo" variante="whatsapp" tamanho="sm" @click="enviarWhatsapp(l)">
            <UiIcone nome="enviar" :tamanho="14" /> Enviar
          </UiBotao>
        </div>
      </UiCard>
    </TransitionGroup>

    <p class="flex animate-fade-up items-start gap-2 text-label text-muted [animation-delay:200ms]">
      <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0" />
      Crie um link por pessoa. Se alguém sair da equipe, desative ou gere um link novo: o antigo para de funcionar na hora.
    </p>

    <!-- Novo link -->
    <UiDialogo v-model="novoAberto" :titulo="criado ? 'Link pronto!' : 'Novo link'" :descricao="criado ? 'Mande para o assistente. Ele abre no celular e já pode cadastrar.' : 'Para quem é este link?'">
      <Transition name="troca" mode="out-in">
        <form v-if="!criado" key="f" id="form-novo-link" class="flex flex-col gap-4" novalidate @submit.prevent="criarLink">
          <UiCampo v-model="nomeNovo" rotulo="Nome (ex.: Assistente João)" autocomplete="off" :erro="erroNome" />
        </form>
        <div v-else key="p" class="flex flex-col gap-3">
          <div class="flex items-center gap-1 rounded bg-surface p-1 pl-3">
            <span class="min-w-0 flex-1 truncate font-mono text-label">{{ urlDo(criado).replace('https://', '') }}</span>
            <button type="button" :class="botaoIcone" aria-label="Copiar link" @click="copiar(criado)">
              <UiIcone :nome="copiado === criado.id ? 'check' : 'copiar'" :tamanho="16" />
            </button>
          </div>
          <UiBotao variante="whatsapp" tamanho="lg" bloco @click="enviarWhatsapp(criado)">
            <UiIcone nome="enviar" :tamanho="18" /> Enviar pelo WhatsApp
          </UiBotao>
        </div>
      </Transition>
      <template #acoes>
        <template v-if="!criado">
          <UiBotao variante="secundario" :disabled="criando" @click="novoAberto = false">Cancelar</UiBotao>
          <UiBotao ref="botaoCriar" type="submit" form="form-novo-link" :carregando="criando">
            Criar link
            <template #carregando>Criando…</template>
          </UiBotao>
        </template>
        <UiBotao v-else variante="secundario" @click="novoAberto = false">Fechar</UiBotao>
      </template>
    </UiDialogo>

    <!-- Detalhes -->
    <UiDialogo
      v-model="detalhesAberto"
      titulo="Editar link"
      :descricao="selecionado ? `Criado ${tempoRelativo(selecionado.criadoEm)} · ${selecionado.ofertasTotal} ofertas enviadas` : ''"
    >
      <div v-if="selecionado" class="flex flex-col gap-5">
        <UiCampo v-model="nomeEdicao" rotulo="Nome" @focusout="salvarNome" />
        <UiInterruptor
          :model-value="selecionado.ativo"
          @update:model-value="alternarAtivo"
          rotulo="Link ativo"
          descricao="Desativado, quem tem o link vê &quot;Esse link não funciona mais&quot;."
        />

        <Transition name="troca" mode="out-in">
          <div v-if="confirmando" :key="confirmando" class="flex flex-col gap-3 rounded border p-3" :class="confirmando === 'excluir' ? 'border-status-rejeitada/40 bg-status-rejeitada/5' : 'border-line'">
            <p class="text-label">
              <template v-if="confirmando === 'regenerar'">O link atual <strong>para de funcionar na hora</strong>. Você vai precisar mandar o novo para {{ selecionado.nome }}.</template>
              <template v-else>Excluir <strong>{{ selecionado.nome }}</strong>? O link para de funcionar. As ofertas que já vieram por ele continuam no painel.</template>
            </p>
            <div class="flex gap-2">
              <UiBotao tamanho="sm" variante="perigo" :carregando="processando" @click="confirmar">
                {{ confirmando === 'regenerar' ? 'Gerar link novo' : 'Excluir' }}
                <template #carregando>Aguarde…</template>
              </UiBotao>
              <UiBotao tamanho="sm" variante="fantasma" :disabled="processando" @click="confirmando = null">Cancelar</UiBotao>
            </div>
          </div>
          <div v-else key="acoes" class="flex flex-wrap gap-x-5 gap-y-2">
            <button type="button" class="text-label font-semibold text-muted underline decoration-line underline-offset-4 hover:text-fg" @click="confirmando = 'regenerar'">
              Gerar link novo (se o atual vazou)
            </button>
            <button type="button" class="text-label font-semibold text-status-rejeitada" @click="confirmando = 'excluir'">
              Excluir link
            </button>
          </div>
        </Transition>
      </div>
      <template #acoes>
        <UiBotao variante="secundario" @click="detalhesAberto = false">Fechar</UiBotao>
      </template>
    </UiDialogo>

    <!-- QR -->
    <UiDialogo
      v-model="qrAberto"
      :titulo="qrLink?.nome ?? ''"
      descricao="O assistente aponta a câmera do celular e o formulário abre na hora."
    >
      <div v-if="qrLink" class="mx-auto w-full max-w-[240px]">
        <UiQrLink ref="qr" :url="urlDo(qrLink)" :nome-arquivo="`formulario-${qrLink.token}`" />
      </div>
      <template #acoes>
        <UiBotao variante="secundario" @click="qrAberto = false">Fechar</UiBotao>
        <UiBotao @click="qr?.baixarPng()"><UiIcone nome="baixar" :tamanho="16" /> Baixar imagem</UiBotao>
      </template>
    </UiDialogo>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1); }
.lista-leave-active { transition: opacity .2s ease, transform .2s ease; }
.lista-enter-from { opacity: 0; transform: translateY(-10px) scale(.97); }
.lista-leave-to { opacity: 0; transform: scale(.95); }
.lista-move { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
.troca-enter-active, .troca-leave-active { transition: opacity .2s ease, transform .25s ease; }
.troca-enter-from { opacity: 0; transform: translateY(6px); }
.troca-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
