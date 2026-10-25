<script setup lang="ts">
const rota = useRoute()
const { escuro, alternar } = useTema()
const { nome, email, iniciais, carregar, sair } = usePerfil()
await useAsyncData('perfil', carregar)
const { carregar: carregarGrupos } = useGrupos()
await useAsyncData('categorias-grupos', carregarGrupos)
const { conectado: whatsappConectado, carregarStatus } = useWhatsapp()
await useAsyncData('whatsapp-status', carregarStatus)

const ITENS = [
  { to: '/painel', rotulo: 'Início', icone: 'casa' },
  { to: '/painel/ofertas', rotulo: 'Ofertas', icone: 'sacola' },
  { to: '/painel/grupos', rotulo: 'Grupos', icone: 'usuarios' },
  { to: '/painel/links', rotulo: 'Links', icone: 'link' },
  { to: '/painel/whatsapp', rotulo: 'WhatsApp', icone: 'celular' },
  { to: '/painel/categorias', rotulo: 'Categorias', icone: 'etiqueta' },
  { to: '/painel/leads', rotulo: 'Leads', icone: 'usuario-mais' },
  { to: '/painel/configuracoes', rotulo: 'Configurações', icone: 'ajustes' }
] as const

// Celular: 4 atalhos na barra inferior + "Mais" com o resto
const PRINCIPAIS = ITENS.slice(0, 4)
const EXTRAS = ITENS.slice(4)

const ativo = (to: string) => to === '/painel' ? rota.path === '/painel' : rota.path.startsWith(to)
const maisAtivo = computed(() => EXTRAS.some(i => ativo(i.to)))

const maisAberto = ref(false)
watch(() => rota.path, () => (maisAberto.value = false))
const fecharComEsc = (e: KeyboardEvent) => e.key === 'Escape' && (maisAberto.value = false)
onMounted(() => window.addEventListener('keydown', fecharComEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', fecharComEsc))

</script>

<template>
  <div class="min-h-dvh lg:pl-64">
    <!-- Menu lateral (computador) -->
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div class="px-5 py-5">
        <NuxtLink to="/painel"><Logo /></NuxtLink>
      </div>
      <nav class="flex-1 overflow-y-auto px-3">
        <ul class="flex flex-col gap-1">
          <li v-for="i in ITENS" :key="i.to">
            <NuxtLink
              :to="i.to"
              class="flex h-11 items-center gap-3 rounded px-3 transition-colors duration-200"
              :class="ativo(i.to) ? 'bg-fg font-semibold text-bg' : 'text-muted hover:bg-line/50 hover:text-fg'"
            >
              <UiIcone :nome="i.icone" :tamanho="18" />
              {{ i.rotulo }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <div class="flex flex-col gap-3 border-t border-line p-3">
        <NuxtLink to="/painel/whatsapp" class="flex items-center gap-2 rounded px-3 py-2 text-label transition-colors hover:bg-line/50">
          <span class="relative flex size-2">
            <span v-if="whatsappConectado" class="absolute inset-0 animate-ring-out rounded-full bg-whatsapp" />
            <span class="relative size-2 rounded-full" :class="whatsappConectado ? 'bg-whatsapp' : 'bg-status-rejeitada'" />
          </span>
          <span class="text-muted">{{ whatsappConectado ? 'WhatsApp conectado' : 'WhatsApp desconectado' }}</span>
        </NuxtLink>
        <div class="flex items-center gap-3 px-1">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-fg text-label font-semibold text-bg">{{ iniciais }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-label font-semibold">{{ nome }}</span>
            <span class="block truncate text-[12px] text-muted">{{ email }}</span>
          </span>
          <button
            type="button"
            :aria-label="escuro ? 'Usar tema claro' : 'Usar tema escuro'"
            class="flex size-9 items-center justify-center rounded text-muted transition-colors hover:bg-line/50 hover:text-fg"
            @click="alternar"
          >
            <UiIcone :nome="escuro ? 'sol' : 'lua'" :tamanho="18" />
          </button>
          <button
            type="button"
            aria-label="Sair"
            class="flex size-9 items-center justify-center rounded text-muted transition-colors hover:bg-line/50 hover:text-fg"
            @click="sair"
          >
            <UiIcone nome="sair" :tamanho="18" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Topo (celular) -->
    <header class="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl lg:hidden">
      <div class="flex items-center justify-between px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <NuxtLink to="/painel"><Logo /></NuxtLink>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/painel/whatsapp"
            :aria-label="whatsappConectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'"
            class="flex h-9 items-center gap-2 rounded-full border border-line px-3 text-label"
          >
            <span class="relative flex size-2">
              <span v-if="whatsappConectado" class="absolute inset-0 animate-ring-out rounded-full bg-whatsapp" />
              <span class="relative size-2 rounded-full" :class="whatsappConectado ? 'bg-whatsapp' : 'bg-status-rejeitada'" />
            </span>
            WhatsApp
          </NuxtLink>
          <span class="flex size-9 items-center justify-center rounded-full bg-fg text-label font-semibold text-bg">{{ iniciais }}</span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-6 lg:px-8 lg:pb-12 lg:pt-10">
      <slot />
    </main>

    <!-- Barra inferior (celular) -->
    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul class="grid grid-cols-5">
        <li v-for="i in PRINCIPAIS" :key="i.to">
          <NuxtLink :to="i.to" class="flex h-16 flex-col items-center justify-center gap-1">
            <span
              class="flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-spring"
              :class="ativo(i.to) ? 'scale-100 bg-fg text-bg' : 'scale-90 text-muted'"
            >
              <UiIcone :nome="i.icone" :tamanho="20" />
            </span>
            <span class="text-[11px] leading-none" :class="ativo(i.to) ? 'font-semibold text-fg' : 'text-muted'">{{ i.rotulo }}</span>
          </NuxtLink>
        </li>
        <li>
          <button type="button" class="flex h-16 w-full flex-col items-center justify-center gap-1" @click="maisAberto = true">
            <span
              class="flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-spring"
              :class="maisAtivo ? 'scale-100 bg-fg text-bg' : 'scale-90 text-muted'"
            >
              <UiIcone nome="grade" :tamanho="20" />
            </span>
            <span class="text-[11px] leading-none" :class="maisAtivo ? 'font-semibold text-fg' : 'text-muted'">Mais</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Gaveta "Mais" (celular) -->
    <Transition name="fundo">
      <div v-if="maisAberto" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] lg:hidden" @click="maisAberto = false" />
    </Transition>
    <Transition name="gaveta">
      <div
        v-if="maisAberto"
        role="dialog"
        aria-label="Mais opções"
        class="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] border-t border-line bg-elevated px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-pop lg:hidden"
      >
        <span class="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
        <ul class="flex flex-col">
          <li v-for="(i, n) in EXTRAS" :key="i.to" class="item" :style="{ animationDelay: `${60 + n * 40}ms` }">
            <NuxtLink
              :to="i.to"
              class="flex h-14 items-center gap-4 rounded px-3 transition-colors"
              :class="ativo(i.to) ? 'bg-surface font-semibold' : 'active:bg-surface'"
            >
              <span class="flex size-9 items-center justify-center rounded-full bg-surface"><UiIcone :nome="i.icone" :tamanho="18" /></span>
              <span class="flex-1">{{ i.rotulo }}</span>
              <UiIcone nome="seta-direita" :tamanho="16" class="text-muted" />
            </NuxtLink>
          </li>
          <li class="item my-2 border-t border-line" :style="{ animationDelay: '220ms' }" />
          <li class="item" :style="{ animationDelay: '240ms' }">
            <button type="button" class="flex h-14 w-full items-center gap-4 rounded px-3 active:bg-surface" @click="alternar">
              <span class="flex size-9 items-center justify-center rounded-full bg-surface"><UiIcone :nome="escuro ? 'sol' : 'lua'" :tamanho="18" /></span>
              <span class="flex-1 text-left">{{ escuro ? 'Tema claro' : 'Tema escuro' }}</span>
            </button>
          </li>
          <li class="item" :style="{ animationDelay: '280ms' }">
            <button type="button" class="flex h-14 w-full items-center gap-4 rounded px-3 text-status-rejeitada active:bg-surface" @click="sair">
              <span class="flex size-9 items-center justify-center rounded-full bg-status-rejeitada/10"><UiIcone nome="sair" :tamanho="18" /></span>
              <span class="flex-1 text-left">Sair</span>
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fundo-enter-active, .fundo-leave-active { transition: opacity .25s ease; }
.fundo-enter-from, .fundo-leave-to { opacity: 0; }

.gaveta-enter-active { transition: transform .45s cubic-bezier(.22, 1, .36, 1); }
.gaveta-leave-active { transition: transform .25s ease-in; }
.gaveta-enter-from, .gaveta-leave-to { transform: translateY(100%); }

.item { animation: fade-up .4s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
</style>
