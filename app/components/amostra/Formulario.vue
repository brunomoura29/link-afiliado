<script setup lang="ts">
// Prévia da tela /f/[token]: o que o assistente vai usar no celular.
const toast = useToast()
const { disparar } = useConfete()

const categoria = ref('')
const link = ref('')
const erroLink = ref('')
const salvando = ref(false)
const salvo = ref(false)
const botao = ref<{ $el: HTMLElement }>()

const categorias = [
  { valor: 'casa', rotulo: 'Casa e Cozinha' },
  { valor: 'eletronicos', rotulo: 'Eletrônicos' },
  { valor: 'moda', rotulo: 'Moda' },
  { valor: 'beleza', rotulo: 'Beleza' }
]

const plataforma = computed(() => detectarPlataforma(link.value))
watch(link, () => (erroLink.value = ''))

async function colarExemplo() {
  const exemplos = ['https://meli.la/2xYp8Qa', 'https://s.shopee.com.br/8AbC12xyz', 'https://amzn.to/3xKp9Qa', 'https://vm.tiktok.com/ZMh8k2Lp/']
  link.value = exemplos[Math.floor(Math.random() * exemplos.length)]!
}

async function salvar() {
  if (!categoria.value) {
    toast.erro('Escolha uma categoria', 'É ela que define para quais grupos a oferta vai.')
    return
  }
  if (!plataforma.value) {
    erroLink.value = link.value ? 'Esse não parece um link válido (precisa começar com https://)' : 'Cole o link de afiliado'
    return
  }
  salvando.value = true
  await new Promise(r => setTimeout(r, 1300))
  salvando.value = false
  salvo.value = true
  disparar(botao.value?.$el ?? null)
  toast.mostrar({
    tipo: 'sucesso',
    titulo: 'Oferta recebida!',
    descricao: 'Já estamos lendo o produto e escrevendo a legenda.',
    acao: { rotulo: 'Desfazer', aoClicar: () => toast.info('Oferta removida') }
  })
  setTimeout(() => {
    salvo.value = false
    link.value = ''
  }, 2200)
}
</script>

<template>
  <div class="mx-auto w-full max-w-[380px] rounded-[28px] border border-line bg-surface p-2 shadow-pop">
    <div class="overflow-hidden rounded-[22px] bg-bg">
      <div class="flex items-center justify-between px-5 pb-1 pt-3 text-[12px] font-semibold text-muted">
        <span>9:41</span>
        <span class="h-1.5 w-16 rounded-full bg-line" />
        <span>100%</span>
      </div>
      <form class="flex flex-col gap-4 p-5 pt-6" @submit.prevent="salvar">
        <div class="animate-fade-up">
          <p class="text-label text-muted">Loja da Ana · enviar oferta</p>
          <h3 class="text-title">Nova oferta</h3>
        </div>

        <div class="animate-fade-up [animation-delay:80ms]">
          <UiSelecao v-model="categoria" rotulo="Categoria" placeholder="Selecione…" :opcoes="categorias" />
        </div>

        <div class="animate-fade-up [animation-delay:160ms]">
          <UiCampo
            v-model="link"
            rotulo="Link de afiliado"
            type="url"
            inputmode="url"
            :erro="erroLink"
            dica="Gere o link no app oficial e cole aqui."
          >
            <template #fim>
              <Transition name="detectado" mode="out-in">
                <span
                  v-if="plataforma"
                  :key="plataforma"
                  class="flex size-7 items-center justify-center rounded-full bg-fg text-bg"
                >
                  <UiIcone nome="check" :tamanho="15" :traco="3" />
                </span>
                <UiIcone v-else nome="link" class="text-muted" />
              </Transition>
            </template>
          </UiCampo>
        </div>

        <div class="flex h-7 items-center animate-fade-up [animation-delay:240ms]">
          <Transition name="detectado" mode="out-in">
            <UiBadgePlataforma v-if="plataforma" :key="plataforma" :plataforma="plataforma" />
            <button
              v-else
              type="button"
              class="text-label text-muted underline decoration-line underline-offset-4 hover:text-fg"
              @click="colarExemplo"
            >
              Colar um link de exemplo
            </button>
          </Transition>
        </div>

        <div class="animate-fade-up [animation-delay:320ms]">
          <UiBotao ref="botao" type="submit" tamanho="lg" bloco :carregando="salvando" :sucesso="salvo">
            <UiIcone nome="enviar" :tamanho="18" />
            Salvar oferta
            <template #sucesso>Oferta salva!</template>
          </UiBotao>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.detectado-enter-active { transition: opacity .2s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1); }
.detectado-leave-active { transition: opacity .12s ease, transform .12s ease; }
.detectado-enter-from { opacity: 0; transform: scale(.4) rotate(-12deg); }
.detectado-leave-to { opacity: 0; transform: scale(.8); }
</style>
