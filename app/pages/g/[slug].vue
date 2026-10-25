<script setup lang="ts">
import type { Plataforma } from '#shared/utils/plataforma'

// Página pública de entrada no grupo (link que o cliente divulga nas redes).
// Dados: server/api/publico/entrada. O botão é um link para /g/<slug>/entrar, que
// registra o clique e manda para o convite do grupo com vaga.
const rota = useRoute()
const slug = String(rota.params.slug)
const origem = computed(() => String(rota.query.src ?? '').toLowerCase())

const { data: grupo, error } = await useFetch(`/api/publico/entrada/${slug}`, { key: `entrada-${slug}` })
if (import.meta.server && error.value) setResponseStatus(useRequestEvent()!, 404)

useSeoMeta({
  title: () => grupo.value ? `${grupo.value.nome} · Grupo de ofertas no WhatsApp` : 'Grupo não encontrado',
  description: () => grupo.value?.descricao || undefined,
  ogTitle: () => grupo.value ? `${grupo.value.emoji} ${grupo.value.nome}` : undefined,
  ogDescription: () => grupo.value ? `${grupo.value.descricao ? `${grupo.value.descricao} ` : ''}Entre grátis no grupo do WhatsApp.` : undefined,
  ogType: 'website',
  twitterCard: 'summary_large_image'
  // TODO: ogImage gerada por grupo (imagem com nome, emoji e nº de membros)
})

const linkEntrar = computed(() => `/g/${slug}/entrar${origem.value ? `?src=${encodeURIComponent(origem.value)}` : ''}`)

// Cor estável da miniatura enquanto a foto não carrega
const matizDo = (id: string) => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 360, 7)
const ofertas = computed(() => (grupo.value?.ofertas ?? []).map(o => ({ ...o, plataforma: o.plataforma as Plataforma, matiz: matizDo(o.id) })))

const BENEFICIOS = [
  { icone: 'mensagem', titulo: 'Só ofertas, sem conversa', texto: 'Ninguém manda mensagem no grupo além das promoções.' },
  { icone: 'cadeado', titulo: 'Preço conferido', texto: 'O valor vem direto da página do produto na hora do envio.' },
  { icone: 'x', titulo: 'Sai quando quiser', texto: 'Sem mensagem no seu privado, sem cadastro.' }
] as const

const CORES_AVATAR = ['bg-shopee', 'bg-ml-blue', 'bg-status-aprovada', 'bg-fg', 'bg-muted']
const INICIAIS = ['M', 'J', 'C', 'R', 'A']

// O link é normal (funciona sem JS); aqui só mostra "abrindo…" depois do toque
const abrindo = ref(false)
</script>

<template>
  <!-- Não encontrado -->
  <div v-if="!grupo" class="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <span class="mb-5 flex size-16 animate-pop items-center justify-center rounded-full bg-surface text-muted">
      <UiIcone nome="usuarios" :tamanho="28" />
    </span>
    <h1 class="animate-fade-up text-title [animation-delay:80ms]">Grupo não encontrado</h1>
    <p class="mt-2 max-w-xs animate-fade-up text-muted [animation-delay:160ms]">Confira o link que você recebeu.</p>
  </div>

  <div v-else class="relative min-h-dvh overflow-x-clip">
    <!-- Brilho de fundo -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
      <div class="brilho absolute -top-32 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-whatsapp/25 blur-3xl" />
    </div>

    <main class="relative mx-auto flex max-w-md flex-col px-4 pb-44 pt-[max(40px,env(safe-area-inset-top))]">
      <!-- Topo -->
      <section class="flex flex-col items-center text-center">
        <span class="flutuar mb-5 flex size-24 items-center justify-center rounded-[28px] border border-line bg-elevated text-[48px] shadow-pop">
          {{ grupo.emoji }}
        </span>
        <p class="animate-fade-up text-label font-semibold text-muted [animation-delay:80ms]">Grupo de ofertas no WhatsApp</p>
        <h1 class="mt-1 animate-fade-up text-[28px] font-semibold leading-9 tracking-tight [animation-delay:140ms]">{{ grupo.nome }}</h1>
        <p v-if="grupo.dono" class="mt-1 animate-fade-up text-label text-muted [animation-delay:180ms]">por {{ grupo.dono }}</p>
        <p v-if="grupo.descricao" class="mt-4 animate-fade-up [animation-delay:220ms]">{{ grupo.descricao }}</p>
      </section>

      <!-- Números -->
      <section class="mt-8 grid animate-fade-up grid-cols-3 divide-x divide-line rounded-lg border border-line bg-elevated py-4 shadow-card [animation-delay:280ms]">
        <div class="flex flex-col items-center gap-1 px-2">
          <div class="flex -space-x-2">
            <span
              v-for="(ini, i) in INICIAIS.slice(0, 3)"
              :key="i"
              class="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-elevated"
              :class="CORES_AVATAR[i]"
            >{{ ini }}</span>
          </div>
          <template v-if="grupo.membros">
            <p class="font-semibold"><UiContador :valor="grupo.membros" /></p>
            <p class="text-[12px] text-muted">membros</p>
          </template>
          <template v-else>
            <p class="font-semibold">Novo</p>
            <p class="text-[12px] text-muted">grupo</p>
          </template>
        </div>
        <div class="flex flex-col items-center justify-end gap-1 px-2">
          <p class="text-title">{{ grupo.ofertasPorDia ? `~${grupo.ofertasPorDia}` : 'Todo dia' }}</p>
          <p class="text-[12px] text-muted">{{ grupo.ofertasPorDia ? 'ofertas/dia' : 'novas ofertas' }}</p>
        </div>
        <div class="flex flex-col items-center justify-end gap-1 px-2">
          <div class="flex gap-1">
            <span v-for="p in (['shopee', 'mercado_livre', 'amazon'] as const)" :key="p" class="size-3 rounded-full" :style="{ background: corPlataforma(p) }" />
          </div>
          <p class="text-label font-semibold">Várias lojas</p>
          <p class="text-[12px] text-muted">e marketplaces</p>
        </div>
      </section>

      <!-- Ofertas recentes -->
      <section v-if="ofertas.length" class="mt-10">
        <h2 v-reveal class="mb-3 font-semibold">Ofertas recentes</h2>
        <div class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          <div
            v-for="(o, i) in ofertas"
            :key="o.id"
            v-reveal="i * 80"
            class="w-40 shrink-0 snap-start"
          >
            <OfertaCard v-bind="o" compacto />
          </div>
        </div>
      </section>

      <!-- Benefícios -->
      <section class="mt-10 flex flex-col gap-4">
        <div v-for="(b, i) in BENEFICIOS" :key="b.titulo" v-reveal="i * 80" class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
            <UiIcone :nome="b.icone" :tamanho="18" />
          </span>
          <div>
            <p class="font-semibold">{{ b.titulo }}</p>
            <p class="text-label text-muted">{{ b.texto }}</p>
          </div>
        </div>
      </section>
    </main>

    <!-- Chamada fixa -->
    <div class="fixed inset-x-0 bottom-0 z-30">
      <div class="mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-10">
        <template v-if="grupo.situacao === 'aberto'">
          <div class="relative">
            <span v-if="!abrindo" aria-hidden="true" class="chamar absolute inset-0 rounded bg-whatsapp" />
            <a
              :href="linkEntrar"
              class="relative flex h-14 w-full items-center justify-center gap-2 rounded bg-whatsapp px-6 font-semibold text-[#0b3d1f] transition-transform active:scale-[.97]"
              @click="abrindo = true"
            >
              <UiSpinner v-if="abrindo" />
              <UiIcone v-else nome="usuarios" :tamanho="18" />
              {{ abrindo ? 'Abrindo o WhatsApp…' : 'Entrar no grupo' }}
            </a>
          </div>
          <p class="mt-2 text-center text-[12px] text-muted">Grátis · abre direto no WhatsApp</p>
        </template>
        <template v-else>
          <UiBotao tamanho="lg" bloco disabled>{{ grupo.situacao === 'lotado' ? 'Grupo lotado' : 'Grupo abre em breve' }}</UiBotao>
          <p class="mt-2 text-center text-label text-muted">
            {{ grupo.situacao === 'lotado' ? 'Um novo grupo abre em breve.' : 'Estamos preparando o grupo.' }} Volte por este mesmo link.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flutuar { animation: pop .45s cubic-bezier(.34, 1.56, .64, 1) both, flutuar 4s ease-in-out .6s infinite; }
@keyframes flutuar {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-6px) rotate(-2deg); }
}
@keyframes pop {
  0% { opacity: 0; transform: scale(.6); }
  60% { opacity: 1; transform: scale(1.08); }
  100% { transform: scale(1); }
}
.brilho { animation: respirar 6s ease-in-out infinite; }
@keyframes respirar {
  0%, 100% { opacity: .7; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
}
/* Anel que "chama" o toque no botão principal */
.chamar { animation: chamar 2.2s cubic-bezier(.22, 1, .36, 1) infinite; }
@keyframes chamar {
  0% { opacity: .5; transform: scale(1); }
  70%, 100% { opacity: 0; transform: scale(1.06, 1.35); }
}
</style>
