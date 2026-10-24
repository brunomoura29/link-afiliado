<script setup lang="ts">
// Cadastrar oferta pelo próprio painel (mesma lógica do formulário público).
const emit = defineEmits<{ fechar: [] }>()

const toast = useToast()
const { categorias } = useGrupos()
const { adicionar } = useOfertas()
const salvando = ref(false)

const categoria = ref('')
const link = ref('')
const erroCategoria = ref('')
const erroLink = ref('')
watch(categoria, () => (erroCategoria.value = ''))
watch(link, () => (erroLink.value = ''))

const opcoes = computed(() => categorias.value.filter(c => c.ativa).map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` })))
const plataforma = computed(() => detectarPlataforma(link.value))

async function colar() {
  try {
    const t = await navigator.clipboard.readText()
    if (t) link.value = t.trim()
  } catch {
    toast.info('Não deu para colar automaticamente', 'Toque e segure no campo e escolha "Colar".')
  }
}

async function salvar() {
  if (!categoria.value) erroCategoria.value = 'Escolha para quais grupos a oferta vai'
  if (!plataforma.value) erroLink.value = link.value ? 'Esse não parece um link válido' : 'Cole o link de afiliado'
  if (erroCategoria.value || erroLink.value || !plataforma.value) return

  salvando.value = true
  const resultado = await adicionar(categoria.value, normalizarLink(link.value), plataforma.value)
  salvando.value = false
  if (resultado === 'duplicada') {
    erroLink.value = 'Esse link já foi cadastrado'
    return
  }
  if (resultado === 'erro') {
    toast.erro('Não foi possível salvar', 'Verifique sua internet e tente de novo.')
    return
  }
  toast.sucesso('Oferta recebida', 'Ela fica pendente até lermos o produto.')
  emit('fechar')
}
</script>

<template>
  <form id="form-nova-oferta" class="flex flex-col gap-4" novalidate @submit.prevent="salvar">
    <UiSelecao v-model="categoria" rotulo="Categoria" placeholder="Selecione a categoria" :opcoes="opcoes" :erro="erroCategoria" />
    <UiCampo v-model="link" rotulo="Link de afiliado" type="url" inputmode="url" :erro="erroLink" dica="De qualquer loja: Shopee, Mercado Livre, Amazon, TikTok Shop…">
      <template #fim>
        <Transition name="marcado" mode="out-in">
          <span v-if="plataforma" key="ok" class="flex size-8 items-center justify-center rounded-full bg-fg text-bg">
            <UiIcone nome="check" :tamanho="16" :traco="3" />
          </span>
          <button v-else key="colar" type="button" class="flex h-9 items-center gap-1.5 rounded bg-fg px-3 text-label font-semibold text-bg active:scale-95" @click="colar">
            <UiIcone nome="copiar" :tamanho="14" /> Colar
          </button>
        </Transition>
      </template>
    </UiCampo>
    <div class="h-7">
      <Transition name="marcado"><UiBadgePlataforma v-if="plataforma" :plataforma="plataforma" /></Transition>
    </div>
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <UiBotao variante="secundario" @click="emit('fechar')">Cancelar</UiBotao>
      <UiBotao type="submit" :carregando="salvando">
        <UiIcone nome="enviar" :tamanho="16" /> Salvar oferta
        <template #carregando>Salvando…</template>
      </UiBotao>
    </div>
  </form>
</template>

<style scoped>
.marcado-enter-active { transition: opacity .2s ease, transform .4s cubic-bezier(.34, 1.56, .64, 1); }
.marcado-leave-active { transition: opacity .12s ease, transform .12s ease; }
.marcado-enter-from { opacity: 0; transform: scale(.4); }
.marcado-leave-to { opacity: 0; transform: scale(.8); }
</style>
