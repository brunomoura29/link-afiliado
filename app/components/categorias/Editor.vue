<script setup lang="ts">
import type { CategoriaGrupo } from '~/composables/useGrupos'

// Formulário de criar/editar categoria (vai dentro do UiDialogo).
const props = defineProps<{ categoria: CategoriaGrupo | null }>()
const emit = defineEmits<{ fechar: [] }>()

const toast = useToast()
const { categorias, daCategoria, salvarCategoria, excluirCategoria } = useGrupos()

const EMOJIS = ['🏠', '🍳', '🛋️', '🧹', '🎧', '📱', '💻', '🎮', '👗', '👟', '👜', '💄', '💅', '🧴', '🧸', '👶', '🐶', '🐱', '🏋️', '⚽', '🚗', '🔧', '🌱', '📚', '🎁', '⌚', '💍', '🧳', '☕', '🍷', '🛒', '🔥']

const novo = !props.categoria
const r = reactive<CategoriaGrupo>(props.categoria
  ? { ...props.categoria }
  : { id: `c${Date.now()}`, nome: '', emoji: '🛒', slug: '', palavraChave: '', descricao: '', ativa: true, autoCriar: true, padraoNome: '', soAdmins: true })

// Endereço, palavra-chave e nome dos grupos acompanham o nome até a pessoa mexer neles
const tocado = reactive({ slug: !novo, palavraChave: !novo, padraoNome: !novo })
watch(() => r.nome, (nome) => {
  if (!tocado.slug) r.slug = gerarSlug(nome)
  if (!tocado.palavraChave) r.palavraChave = gerarPalavraChave(nome)
  if (!tocado.padraoNome) r.padraoNome = nome.trim() ? `${nome.trim()} #` : ''
})
const editar = (campo: keyof typeof tocado) => (tocado[campo] = true)
const maiusculas = (v: string) => v.toUpperCase()

const escolhendoEmoji = ref(false)
const erros = reactive({ nome: '', slug: '', palavraChave: '' })
watch(() => [r.nome, r.slug, r.palavraChave], () => Object.assign(erros, { nome: '', slug: '', palavraChave: '' }))

const outras = computed(() => categorias.value.filter(c => c.id !== r.id))
const qtdGrupos = computed(() => daCategoria(r.id).length)

const salvando = ref(false)
const salvo = ref(false)
async function salvar() {
  r.slug = gerarSlug(r.slug) // tira hífen sobrando no fim
  erros.nome = r.nome.trim().length < 2 ? 'Dê um nome para a categoria' : ''
  erros.slug = !r.slug ? 'Informe o endereço do link'
    : outras.value.some(c => c.slug === r.slug) ? 'Esse endereço já é de outra categoria' : ''
  erros.palavraChave = r.palavraChave && outras.value.some(c => c.palavraChave === r.palavraChave.trim())
    ? 'Essa palavra-chave já é de outra categoria' : ''
  if (erros.nome || erros.slug || erros.palavraChave) return

  salvando.value = true
  await salvarCategoria({ ...r, nome: r.nome.trim(), palavraChave: r.palavraChave.trim() })
  salvando.value = false
  salvo.value = true
  toast.sucesso(novo ? 'Categoria criada' : 'Categoria salva', novo ? 'Agora crie ou escolha os grupos dela.' : undefined)
  setTimeout(() => emit('fechar'), 500)
}

const confirmandoExclusao = ref(false)
const excluindo = ref(false)
async function excluir() {
  excluindo.value = true
  await excluirCategoria(r.id)
  excluindo.value = false
  toast.info('Categoria excluída', qtdGrupos.value ? 'Os grupos dela foram para "Sem categoria".' : undefined)
  emit('fechar')
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="salvar">
    <!-- Emoji + nome -->
    <div class="flex items-start gap-3">
      <button
        type="button"
        aria-label="Escolher emoji"
        class="flex size-14 shrink-0 items-center justify-center rounded border bg-surface text-[26px] transition-[transform,border-color] active:scale-95"
        :class="escolhendoEmoji ? 'border-fg' : 'border-line'"
        @click="escolhendoEmoji = !escolhendoEmoji"
      >
        <Transition name="emoji" mode="out-in"><span :key="r.emoji">{{ r.emoji }}</span></Transition>
      </button>
      <div class="flex-1">
        <UiCampo v-model="r.nome" rotulo="Nome da categoria" :erro="erros.nome" />
      </div>
    </div>

    <Transition name="grade">
      <div v-if="escolhendoEmoji" class="grid grid-cols-8 gap-1 rounded border border-line bg-surface p-2">
        <button
          v-for="e in EMOJIS"
          :key="e"
          type="button"
          class="flex aspect-square items-center justify-center rounded text-[22px] transition-transform hover:scale-110 active:scale-95"
          :class="r.emoji === e && 'bg-elevated shadow-card'"
          @click="r.emoji = e; escolhendoEmoji = false"
        >{{ e }}</button>
      </div>
    </Transition>

    <!-- Divulgação -->
    <fieldset class="flex flex-col gap-4">
      <legend class="mb-3 text-label font-semibold text-muted">Divulgação</legend>
      <UiCampo
        v-model="r.slug"
        rotulo="Endereço do link de entrada"
        :erro="erros.slug"
        :dica="`linkafiliado.app/g/${r.slug || '…'}`"
        :formatar="limparSlug"
        @input="editar('slug')"
      />
      <UiCampo
        v-model="r.palavraChave"
        rotulo="Palavra-chave"
        :formatar="maiusculas"
        :erro="erros.palavraChave"
        dica="Quem mandar essa mensagem no seu WhatsApp recebe o convite do grupo."
        @input="editar('palavraChave')"
      />
      <UiCampo v-model="r.descricao" rotulo="Frase da página de entrada" dica="Aparece embaixo do nome, na página que você divulga." />
    </fieldset>

    <!-- Grupos -->
    <fieldset class="flex flex-col gap-4">
      <legend class="mb-3 text-label font-semibold text-muted">Grupos novos</legend>
      <UiCampo
        v-model="r.padraoNome"
        rotulo="Nome dos grupos"
        :dica="`O # vira o número: ${(r.padraoNome || 'Grupo #').replace('#', '#4')}`"
        @input="editar('padraoNome')"
      />
      <UiInterruptor v-model="r.autoCriar" rotulo="Criar grupo novo quando lotar" descricao="O link de entrada passa para o grupo novo sozinho." />
      <UiInterruptor v-model="r.soAdmins" rotulo="Só admins enviam mensagens" descricao="O grupo fica só com as ofertas, sem conversa." />
    </fieldset>

    <UiInterruptor v-model="r.ativa" rotulo="Categoria ativa" descricao="Desligada, nada é enviado para os grupos dela." />

    <div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      <UiBotao variante="secundario" :disabled="salvando" @click="emit('fechar')">Cancelar</UiBotao>
      <UiBotao type="submit" :carregando="salvando" :sucesso="salvo">
        {{ novo ? 'Criar categoria' : 'Salvar' }}
        <template #carregando>Salvando…</template>
        <template #sucesso>Salvo!</template>
      </UiBotao>
    </div>

    <!-- Excluir -->
    <div v-if="!novo" class="border-t border-line pt-4">
      <Transition name="grade" mode="out-in">
        <div v-if="confirmandoExclusao" key="c" class="flex flex-col gap-3 rounded border border-status-rejeitada/40 bg-status-rejeitada/5 p-3">
          <p class="text-label">
            Excluir <strong>{{ r.nome }}</strong>?
            <template v-if="qtdGrupos">Os {{ qtdGrupos }} grupos dela vão para "Sem categoria" e param de receber ofertas.</template>
            O link de entrada deixa de funcionar.
          </p>
          <div class="flex gap-2">
            <UiBotao tamanho="sm" variante="perigo" :carregando="excluindo" @click="excluir">
              Excluir
              <template #carregando>Excluindo…</template>
            </UiBotao>
            <UiBotao tamanho="sm" variante="fantasma" :disabled="excluindo" @click="confirmandoExclusao = false">Cancelar</UiBotao>
          </div>
        </div>
        <button v-else key="b" type="button" class="text-label font-semibold text-status-rejeitada" @click="confirmandoExclusao = true">
          Excluir categoria
        </button>
      </Transition>
    </div>
  </form>
</template>

<style scoped>
.emoji-enter-active { transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .2s; }
.emoji-leave-active { transition: transform .12s ease, opacity .12s; }
.emoji-enter-from { transform: scale(.3) rotate(-20deg); opacity: 0; }
.emoji-leave-to { transform: scale(.6); opacity: 0; }

.grade-enter-active { transition: opacity .2s ease, transform .3s cubic-bezier(.22, 1, .36, 1); }
.grade-leave-active { transition: opacity .12s ease, transform .12s ease; }
.grade-enter-from, .grade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
