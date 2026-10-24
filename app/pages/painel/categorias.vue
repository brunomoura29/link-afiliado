<script setup lang="ts">
import type { CategoriaGrupo } from '~/composables/useGrupos'

definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Categorias · LinkAfiliado' })

const { categorias, daCategoria, entradaAtiva } = useGrupos()

// null = fechado; 'nova' = criando; objeto = editando
const editando = ref<CategoriaGrupo | 'nova' | null>(null)
const editorAberto = computed({ get: () => !!editando.value, set: v => !v && (editando.value = null) })
const tituloEditor = computed(() => editando.value === 'nova' ? 'Nova categoria' : 'Editar categoria')

function resumo(c: CategoriaGrupo) {
  const lista = daCategoria(c.id)
  const membros = lista.reduce((s, g) => s + g.membros, 0)
  return `${lista.length} ${lista.length === 1 ? 'grupo' : 'grupos'} · ${membros.toLocaleString('pt-BR')} membros`
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">Categorias</h1>
        <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Cada categoria tem seus grupos, seu link de entrada e sua palavra-chave.</p>
      </div>
      <UiBotao tamanho="sm" class="shrink-0" @click="editando = 'nova'">
        <span class="text-[18px] leading-none">+</span> Nova
      </UiBotao>
    </header>

    <!-- Vazio -->
    <UiCard v-if="!categorias.length" class="flex animate-fade-up flex-col items-center gap-3 p-8 text-center">
      <span class="flex size-14 items-center justify-center rounded-full bg-surface"><UiIcone nome="etiqueta" :tamanho="24" /></span>
      <p class="font-semibold">Nenhuma categoria ainda</p>
      <p class="max-w-xs text-label text-muted">Crie categorias como "Casa e Cozinha" ou "Eletrônicos" para separar as ofertas por grupo.</p>
      <UiBotao @click="editando = 'nova'">Criar a primeira</UiBotao>
    </UiCard>

    <TransitionGroup v-else tag="div" name="lista" class="grid auto-rows-fr gap-3 sm:grid-cols-2">
      <button
        v-for="(c, i) in categorias"
        :key="c.id"
        v-reveal="i * 60"
        type="button"
        class="group flex h-full flex-col gap-3 rounded-lg border border-line bg-elevated p-4 text-left shadow-card transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-pop active:scale-[.99]"
        :class="!c.ativa && 'opacity-60'"
        @click="editando = c"
      >
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded bg-surface text-[22px] transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110">{{ c.emoji }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ c.nome }}</span>
            <span class="block text-label text-muted">{{ resumo(c) }}</span>
          </span>
          <span v-if="!c.ativa" class="rounded-full bg-surface px-2 py-0.5 text-[12px] font-semibold text-muted">Pausada</span>
          <UiIcone v-else nome="seta-direita" :tamanho="18" class="text-muted transition-transform duration-300 ease-spring group-hover:translate-x-1" />
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span class="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-2 font-mono text-[12px] text-muted">
            <UiIcone nome="link" :tamanho="12" /> /g/{{ c.slug }}
          </span>
          <span v-if="c.palavraChave" class="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-2 text-[12px] text-muted">
            <UiIcone nome="mensagem" :tamanho="12" /> {{ c.palavraChave }}
          </span>
          <span v-if="c.autoCriar" class="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-2 text-[12px] text-muted">
            <UiIcone nome="atualizar" :tamanho="12" /> Cria grupo ao lotar
          </span>
        </div>

        <!-- Rodapé fixo: qual grupo recebe os membros novos -->
        <div class="mt-auto flex min-w-0 items-center gap-2 border-t border-line pt-3 text-[12px]">
          <template v-if="entradaAtiva(c.id)">
            <span class="size-2 shrink-0 animate-pulse rounded-full bg-whatsapp" />
            <span class="truncate text-muted">Entrando em <strong class="font-semibold text-fg">{{ entradaAtiva(c.id)!.nome }}</strong></span>
          </template>
          <template v-else>
            <UiIcone nome="alerta" :tamanho="14" class="shrink-0 text-status-rejeitada" />
            <span class="truncate font-semibold text-status-rejeitada">Sem grupo com vaga para novos membros</span>
          </template>
        </div>
      </button>
    </TransitionGroup>

    <UiDialogo v-model="editorAberto" :titulo="tituloEditor" largura="larga">
      <CategoriasEditor
        v-if="editando"
        :key="editando === 'nova' ? 'nova' : editando.id"
        :categoria="editando === 'nova' ? null : editando"
        @fechar="editando = null"
      />
    </UiDialogo>
  </div>
</template>

<style scoped>
.lista-enter-active { transition: opacity .3s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1); }
.lista-leave-active { transition: opacity .2s ease, transform .2s ease; }
.lista-enter-from { opacity: 0; transform: scale(.95); }
.lista-leave-to { opacity: 0; transform: scale(.95); }
.lista-move { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
</style>
