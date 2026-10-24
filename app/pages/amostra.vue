<script setup lang="ts">
import type { Plataforma } from '#shared/utils/plataforma'

useHead({ title: 'Amostra de design · LinkAfiliado' })

const toast = useToast()
const { escuro, alternar } = useTema()
const { disparar } = useConfete()

const SECOES = [
  ['cores', 'Cores'], ['tipografia', 'Tipografia'], ['botoes', 'Botões'], ['formulario', 'Formulário'],
  ['badges', 'Badges'], ['cards', 'Cards'], ['toasts', 'Toasts'], ['ia-envio', 'IA e envio'],
  ['whatsapp', 'WhatsApp'], ['movimento', 'Movimento']
] as const

// Cores — clicar copia o hex
const PALETAS = [
  {
    nome: 'Base',
    cores: [
      { nome: 'Texto', var: 'fg', hex: '#0d0d0d / #f2f2f2' },
      { nome: 'Secundário', var: 'muted', hex: '#5c5c5c / #a3a3a3' },
      { nome: 'Borda', var: 'line', hex: '#e3e3e3 / #333333' },
      { nome: 'Fundo', var: 'bg', hex: '#ffffff / #121212' },
      { nome: 'Superfície', var: 'surface', hex: '#f7f7f7 / #1b1b1b' }
    ]
  },
  {
    nome: 'Marketplaces',
    cores: [
      { nome: 'Shopee', var: 'shopee', hex: '#ee4d2d' },
      { nome: 'Shopee tint', var: 'shopee-tint', hex: '#fdeae6' },
      { nome: 'ML amarelo', var: 'ml-yellow', hex: '#fff159' },
      { nome: 'ML azul', var: 'ml-blue', hex: '#3483fa' },
      { nome: 'ML tint', var: 'ml-tint', hex: '#fffbe0' },
      { nome: 'WhatsApp', var: 'whatsapp', hex: '#25d366' }
    ]
  },
  {
    nome: 'Status',
    cores: [
      { nome: 'Pendente', var: 'status-pendente', hex: '#a3a3a3' },
      { nome: 'Aprovada', var: 'status-aprovada', hex: '#1a7f37' },
      { nome: 'Rejeitada', var: 'status-rejeitada', hex: '#c81e3a' },
      { nome: 'Enviada', var: 'whatsapp', hex: '#25d366' }
    ]
  }
]
const copiado = ref('')
async function copiar(texto: string, chave = texto) {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {}
  copiado.value = chave
  toast.mostrar({ tipo: 'info', titulo: 'Copiado', descricao: texto, duracao: 2000 })
  setTimeout(() => copiado.value === chave && (copiado.value = ''), 1500)
}

const TIPOS = [
  { uso: 'Título de tela', classe: 'text-title', spec: '20 / 28 · 600', exemplo: 'Nova oferta' },
  { uso: 'Corpo / inputs', classe: 'text-body', spec: '16 / 24 · 400', exemplo: 'Cole o link de afiliado gerado no app oficial.' },
  { uso: 'Botão principal', classe: 'text-body font-semibold', spec: '16 / 24 · 600', exemplo: 'Salvar oferta' },
  { uso: 'Label / auxiliar', classe: 'text-label text-muted', spec: '14 / 20 · 400', exemplo: 'Enviada há 3 minutos para 2 grupos' }
]

// Botões
const carregando = ref(false)
const sucesso = ref(false)
async function demoCarregar(e: MouseEvent) {
  carregando.value = true
  await new Promise(r => setTimeout(r, 1400))
  carregando.value = false
  sucesso.value = true
  disparar(e.currentTarget as HTMLElement)
  setTimeout(() => (sucesso.value = false), 1800)
}

// Campos soltos
const nomeLink = ref('Assistente João')
const limite = ref('')
const erroLimite = ref('')
function validarLimite() {
  const n = Number(limite.value)
  erroLimite.value = !limite.value || Number.isNaN(n) || n < 1 ? 'Informe um número maior que zero' : ''
  if (!erroLimite.value) toast.sucesso('Limite salvo', `${n} envios por grupo, por dia.`)
}
const naoMadrugada = ref(true)
const somenteGrupos = ref(true)

const TODAS_PLATAFORMAS = Object.keys(PLATAFORMAS) as Plataforma[]

const linkFormulario = 'https://linkafiliado.app/f/a8Kx92mPq7Zt'

// Cards
const OFERTAS = [
  { titulo: 'Fone Bluetooth com cancelamento de ruído, bateria 40h', plataforma: 'mercado_livre', preco: 129.9, original: 199.9, categoria: 'Eletrônicos', status: 'enviada', matiz: 210 },
  { titulo: 'Kit 6 potes herméticos de vidro com tampa bambu', plataforma: 'shopee', preco: 54.9, original: 89.9, categoria: 'Casa e Cozinha', status: 'aprovada', matiz: 20 },
  { titulo: 'Air fryer 4L digital, 1500W, cesto antiaderente', plataforma: 'mercado_livre', preco: 299, original: 449, categoria: 'Casa e Cozinha', status: 'pendente', matiz: 48 },
  { titulo: 'Sérum facial vitamina C 30ml', plataforma: 'amazon', preco: 39.9, original: 79.9, categoria: 'Beleza', status: 'rejeitada', matiz: 330 }
] as const
const carregandoCards = ref(false)
async function recarregarCards() {
  carregandoCards.value = true
  await new Promise(r => setTimeout(r, 1600))
  carregandoCards.value = false
}

// Toasts
function toastAcao() {
  toast.mostrar({
    tipo: 'erro',
    titulo: 'Não conseguimos ler o produto',
    descricao: 'O Mercado Livre bloqueou a leitura. A oferta ficou como rejeitada.',
    acao: { rotulo: 'Tentar de novo', aoClicar: () => toast.info('Tentando novamente…') }
  })
}

// Movimento
const EASINGS = [
  { nome: 'Spring', curva: 'cubic-bezier(.34,1.56,.64,1)', uso: 'Entradas, pops, badges' },
  { nome: 'Out', curva: 'cubic-bezier(.22,1,.36,1)', uso: 'Movimentos, revelar ao rolar' },
  { nome: 'Ease', curva: 'ease', uso: 'Cor, opacidade' }
]
const bolaLigada = ref(false)
</script>

<template>
  <div class="min-h-screen pb-24">
    <!-- Cabeçalho -->
    <header class="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div class="flex items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-lg bg-fg text-bg">
            <UiIcone nome="link" :tamanho="18" :traco="2.5" />
          </span>
          <div>
            <p class="font-semibold leading-5">LinkAfiliado</p>
            <p class="text-label text-muted">Amostra de design</p>
          </div>
        </div>
        <button
          type="button"
          :aria-label="escuro ? 'Usar tema claro' : 'Usar tema escuro'"
          class="relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-line transition-colors hover:bg-surface"
          @click="alternar"
        >
          <Transition name="tema" mode="out-in">
            <UiIcone v-if="escuro" key="sol" nome="sol" />
            <UiIcone v-else key="lua" nome="lua" />
          </Transition>
        </button>
      </div>
      <nav class="mx-auto max-w-5xl overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        <ul class="flex w-max gap-2">
          <li v-for="[id, nome] in SECOES" :key="id">
            <a
              :href="`#${id}`"
              class="block rounded-full border border-line px-3 py-1 text-label text-muted transition-colors hover:border-fg/40 hover:text-fg"
            >{{ nome }}</a>
          </li>
        </ul>
      </nav>
    </header>

    <main class="mx-auto max-w-5xl px-4">
      <!-- Abertura -->
      <section class="py-12 sm:py-16">
        <p class="animate-fade-up text-label font-semibold text-muted">Sistema de design · v0.1</p>
        <h1 class="mt-2 max-w-2xl animate-fade-up text-[32px] font-semibold leading-[40px] tracking-tight [animation-delay:80ms] sm:text-[44px] sm:leading-[52px]">
          Da oferta colada ao grupo
          <span class="relative whitespace-nowrap">
            <span class="relative z-10">no WhatsApp</span>
            <span class="marca absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-whatsapp/40" />
          </span>.
        </h1>
        <p class="mt-4 max-w-xl animate-fade-up text-muted [animation-delay:160ms]">
          Cores, tipografia, componentes e movimento que vão compor o formulário e o painel.
          Tudo aqui é interativo: clique, cole, salve.
        </p>
        <div class="mt-6 flex animate-fade-up flex-wrap gap-2 [animation-delay:240ms]">
          <UiBadgePlataforma plataforma="shopee" />
          <UiBadgePlataforma plataforma="mercado_livre" />
          <UiStatus status="enviada" />
        </div>
      </section>

      <!-- 01 Cores -->
      <AmostraSecao id="cores" numero="01" titulo="Cores" descricao="Neutras para a interface, cores de marca só para sinalizar plataforma e envio. Clique para copiar.">
        <div class="flex flex-col gap-8">
          <div v-for="(p, pi) in PALETAS" :key="p.nome">
            <p class="mb-3 text-label font-semibold text-muted">{{ p.nome }}</p>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <button
                v-for="(c, ci) in p.cores"
                :key="c.nome"
                v-reveal="ci * 50 + pi * 40"
                type="button"
                class="group overflow-hidden rounded-lg border border-line bg-elevated text-left transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-pop active:scale-[.98]"
                @click="copiar(c.hex.split(' / ')[0]!, c.nome)"
              >
                <span class="relative block h-20 border-b border-line" :style="{ background: `rgb(var(--${c.var}))` }">
                  <Transition name="copiado">
                    <span v-if="copiado === c.nome" class="absolute inset-0 flex items-center justify-center bg-black/30 text-white backdrop-blur-[2px]">
                      <UiCheckAnimado :tamanho="22" />
                    </span>
                  </Transition>
                </span>
                <span class="block p-3">
                  <span class="block text-label font-semibold">{{ c.nome }}</span>
                  <span class="block truncate font-mono text-[12px] text-muted">{{ c.hex }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </AmostraSecao>

      <!-- 02 Tipografia -->
      <AmostraSecao id="tipografia" numero="02" titulo="Tipografia" descricao="Fonte do sistema: zero download, carrega instantâneo em qualquer celular.">
        <UiCard class="divide-y divide-line">
          <div v-for="(t, i) in TIPOS" :key="t.uso" v-reveal="i * 60" class="flex flex-col gap-1 p-5 sm:flex-row sm:items-baseline sm:gap-6">
            <div class="w-40 shrink-0">
              <p class="text-label font-semibold">{{ t.uso }}</p>
              <p class="font-mono text-[12px] text-muted">{{ t.spec }}</p>
            </div>
            <p :class="t.classe">{{ t.exemplo }}</p>
          </div>
        </UiCard>
      </AmostraSecao>

      <!-- 03 Botões -->
      <AmostraSecao id="botoes" numero="03" titulo="Botões" descricao="Altura mínima de 48px para o toque. Pressione e segure para ver a onda.">
        <div class="flex flex-col gap-6">
          <div v-reveal class="flex flex-wrap items-center gap-3">
            <UiBotao>Primário</UiBotao>
            <UiBotao variante="secundario">Secundário</UiBotao>
            <UiBotao variante="fantasma">Fantasma</UiBotao>
            <UiBotao variante="perigo">Desativar link</UiBotao>
            <UiBotao variante="whatsapp"><UiIcone nome="enviar" :tamanho="18" /> Enviar agora</UiBotao>
            <UiBotao disabled>Desabilitado</UiBotao>
          </div>
          <div v-reveal="80" class="flex flex-wrap items-center gap-3">
            <UiBotao tamanho="sm">Pequeno</UiBotao>
            <UiBotao>Médio</UiBotao>
            <UiBotao tamanho="lg">Grande</UiBotao>
          </div>
          <div v-reveal="160" class="flex max-w-sm flex-col gap-2">
            <UiBotao tamanho="lg" bloco :carregando="carregando" :sucesso="sucesso" @click="demoCarregar">
              Clique para ver: carregar → sucesso
            </UiBotao>
            <p class="text-label text-muted">Estados encadeados com troca animada e confete no fim.</p>
          </div>
        </div>
      </AmostraSecao>

      <!-- 04 Formulário -->
      <AmostraSecao
        id="formulario"
        numero="04"
        titulo="Formulário"
        descricao="Prévia do /f/[token] que o assistente usa. Cole um link de afiliado de qualquer loja e veja a plataforma ser detectada."
      >
        <div class="grid items-start gap-8 lg:grid-cols-[380px_1fr]">
          <div v-reveal><AmostraFormulario /></div>

          <div class="flex flex-col gap-4">
            <UiCard v-reveal="80" class="flex flex-col gap-4 p-5">
              <p class="font-semibold">Campos</p>
              <UiCampo v-model="nomeLink" rotulo="Nome do link" dica="Só para você identificar quem usa." />
              <UiCampo v-model="limite" rotulo="Limite diário por grupo" inputmode="numeric" :erro="erroLimite">
                <template #fim>
                  <span class="text-label text-muted">/dia</span>
                </template>
              </UiCampo>
              <UiBotao variante="secundario" tamanho="sm" class="self-start" @click="validarLimite">
                Salvar (deixe vazio para ver o erro)
              </UiBotao>
            </UiCard>

            <UiCard v-reveal="140" class="flex flex-col gap-5 p-5">
              <p class="font-semibold">Interruptores</p>
              <UiInterruptor v-model="naoMadrugada" rotulo="Pausar de madrugada" descricao="Nada sai entre 23h e 7h." />
              <UiInterruptor v-model="somenteGrupos" rotulo="Só grupos" descricao="Contatos individuais ficam desligados." />
            </UiCard>

            <UiCard v-reveal="200" class="p-5">
              <p class="mb-3 font-semibold">Link do formulário</p>
              <div class="flex items-center gap-2 rounded border border-line bg-surface p-1.5 pl-4">
                <span class="min-w-0 flex-1 truncate font-mono text-label text-muted">{{ linkFormulario }}</span>
                <UiBotao tamanho="sm" :variante="copiado === 'link' ? 'whatsapp' : 'primario'" @click="copiar(linkFormulario, 'link')">
                  <Transition name="tema" mode="out-in">
                    <UiIcone v-if="copiado === 'link'" key="ok" nome="check" :tamanho="16" :traco="3" />
                    <UiIcone v-else key="cp" nome="copiar" :tamanho="16" />
                  </Transition>
                  {{ copiado === 'link' ? 'Copiado' : 'Copiar' }}
                </UiBotao>
              </div>
            </UiCard>
          </div>
        </div>
      </AmostraSecao>

      <!-- 05 Badges -->
      <AmostraSecao id="badges" numero="05" titulo="Badges e status" descricao="Sempre cor + texto, nunca só texto: leitura rápida mesmo de longe.">
        <UiCard v-reveal class="flex flex-col gap-5 p-5">
          <div class="flex flex-wrap items-center gap-3">
            <span class="w-24 text-label text-muted">Plataforma</span>
            <UiBadgePlataforma v-for="p in TODAS_PLATAFORMAS" :key="p" :plataforma="p" />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="w-24 text-label text-muted">Postagem</span>
            <UiStatus status="pendente" />
            <UiStatus status="aprovada" />
            <UiStatus status="rejeitada" />
            <UiStatus status="enviada" />
          </div>
        </UiCard>
      </AmostraSecao>

      <!-- 06 Cards -->
      <AmostraSecao id="cards" numero="06" titulo="Cards" descricao="Painel: números que sobem ao aparecer, ofertas com hover e carregamento com shimmer.">
        <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <UiCard
            v-for="(s, i) in [
              { rotulo: 'Ofertas hoje', valor: 48, sufixo: '' },
              { rotulo: 'Enviadas', valor: 312, sufixo: '' },
              { rotulo: 'Grupos ativos', valor: 12, sufixo: '' },
              { rotulo: 'Rejeição', valor: 4, sufixo: '%' }
            ]"
            :key="s.rotulo"
            v-reveal="i * 70"
            class="p-4"
          >
            <p class="text-label text-muted">{{ s.rotulo }}</p>
            <p class="mt-1 text-[28px] font-semibold leading-9"><UiContador :valor="s.valor" :sufixo="s.sufixo" /></p>
          </UiCard>
        </div>

        <div class="mb-3 flex justify-end">
          <UiBotao variante="fantasma" tamanho="sm" :disabled="carregandoCards" @click="recarregarCards">
            <UiIcone nome="atualizar" :tamanho="16" :class="carregandoCards && 'animate-spin'" /> Recarregar
          </UiBotao>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <template v-if="carregandoCards">
            <UiCard v-for="i in 4" :key="`sk${i}`" class="overflow-hidden">
              <div class="skeleton aspect-[4/3] rounded-none" />
              <div class="flex flex-col gap-3 p-4">
                <div class="skeleton h-4 w-full" />
                <div class="skeleton h-4 w-2/3" />
                <div class="skeleton h-6 w-1/2" />
              </div>
            </UiCard>
          </template>
          <template v-else>
            <div v-for="(o, i) in OFERTAS" :key="o.titulo" class="animate-fade-up" :style="{ animationDelay: `${i * 70}ms` }">
              <OfertaCard v-bind="o" />
            </div>
          </template>
        </div>
      </AmostraSecao>

      <!-- 07 Toasts -->
      <AmostraSecao
        id="toasts"
        numero="07"
        titulo="Toasts"
        descricao="Entram com mola, a barra mostra o tempo restante, o mouse pausa e dá para arrastar para o lado para dispensar."
      >
        <div v-reveal class="flex flex-wrap gap-3">
          <UiBotao variante="secundario" @click="toast.sucesso('Categoria criada', 'Casa e Cozinha → 3 grupos.')">
            <span class="size-2 rounded-full bg-status-aprovada" /> Sucesso
          </UiBotao>
          <UiBotao variante="secundario" @click="toastAcao">
            <span class="size-2 rounded-full bg-status-rejeitada" /> Erro com ação
          </UiBotao>
          <UiBotao variante="secundario" @click="toast.info('Link desativado', 'Quem tinha esse link não consegue mais enviar.')">
            <span class="size-2 rounded-full bg-fg" /> Info
          </UiBotao>
          <UiBotao variante="secundario" @click="toast.whatsapp('Oferta enviada', 'Publicada em Ofertas do Dia.')">
            <span class="size-2 rounded-full bg-whatsapp" /> WhatsApp
          </UiBotao>
        </div>
      </AmostraSecao>

      <!-- 08 IA e envio -->
      <AmostraSecao
        id="ia-envio"
        numero="08"
        titulo="IA e envio"
        descricao="A IA escreve em volta dos valores travados. Depois, a fila envia um grupo por vez, com intervalo."
      >
        <div class="grid gap-4 lg:grid-cols-2">
          <div v-reveal><AmostraLegenda /></div>
          <div v-reveal="100"><AmostraEnvio /></div>
        </div>
      </AmostraSecao>

      <!-- 09 WhatsApp -->
      <AmostraSecao id="whatsapp" numero="09" titulo="Conexão do WhatsApp" descricao="Cada cliente conecta o próprio número lendo o QR code.">
        <div v-reveal><AmostraWhatsapp /></div>
      </AmostraSecao>

      <!-- 10 Movimento -->
      <AmostraSecao
        id="movimento"
        numero="10"
        titulo="Movimento"
        descricao="Curvas e durações usadas em tudo acima. Quem ativa “reduzir movimento” no sistema vê tudo sem animação."
      >
        <UiCard v-reveal class="divide-y divide-line">
          <div v-for="e in EASINGS" :key="e.nome" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-6">
            <div class="w-48 shrink-0">
              <p class="text-label font-semibold">{{ e.nome }}</p>
              <p class="truncate font-mono text-[12px] text-muted">{{ e.curva }}</p>
              <p class="text-label text-muted">{{ e.uso }}</p>
            </div>
            <div class="relative h-10 flex-1 rounded-full bg-surface">
              <span
                class="absolute top-1 size-8 rounded-full bg-fg shadow-card"
                :style="{
                  left: bolaLigada ? 'calc(100% - 36px)' : '4px',
                  transition: `left 800ms ${e.curva}`
                }"
              />
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 p-5">
            <p class="text-label text-muted">Rápido: 150–250ms (cor, hover) · Médio: 300–500ms (entradas) · Lento: 600–800ms (revelar)</p>
            <UiBotao tamanho="sm" @click="bolaLigada = !bolaLigada">Animar</UiBotao>
          </div>
        </UiCard>
      </AmostraSecao>
    </main>
  </div>
</template>

<style scoped>
.marca {
  transform-origin: left;
  animation: sublinhar .8s cubic-bezier(.22, 1, .36, 1) .5s both;
}
@keyframes sublinhar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.tema-enter-active, .tema-leave-active { transition: opacity .2s ease, transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.tema-enter-from { opacity: 0; transform: rotate(-90deg) scale(.5); }
.tema-leave-to { opacity: 0; transform: rotate(90deg) scale(.5); }
.copiado-enter-active, .copiado-leave-active { transition: opacity .2s ease; }
.copiado-enter-from, .copiado-leave-to { opacity: 0; }
</style>
