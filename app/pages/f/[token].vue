<script setup lang="ts">
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'

// Formulário público que o assistente usa (sem login). Os dados vêm do servidor,
// que valida o token (server/api/publico/formulario).
const rota = useRoute()
const token = String(rota.params.token)
const toast = useToast()
const { disparar } = useConfete()

const { data: form, error: erroForm } = await useFetch(`/api/publico/formulario/${token}`, { key: `form-${token}` })
if (import.meta.server && erroForm.value) setResponseStatus(useRequestEvent()!, 404)

useHead({ title: () => (form.value ? `Enviar oferta · ${form.value.dono}` : 'Link inválido') })
useSeoMeta({ robots: 'noindex, nofollow' })

// Estado
const linkInvalido = ref(false) // desativado enquanto a página estava aberta
const categoria = ref('')
const link = ref('')
const erroLink = ref('')
const erroCategoria = ref('')
const salvando = ref(false)
const salvo = ref(false)
const botao = ref<{ $el: HTMLElement }>()
const enviadas = ref<{ id: string, link: string, plataforma: Plataforma, categoria: string, status: StatusPostagem, titulo: string | null }[]>([])

const plataforma = computed(() => detectarPlataforma(link.value))
const nomeCategoria = computed(() => form.value?.categorias.find(c => c.id === categoria.value)?.nome ?? '')
const opcoesCategoria = computed(() =>
  (form.value?.categorias ?? []).map(c => ({ valor: c.id, rotulo: `${c.emoji}  ${c.nome}` }))
)
watch(link, () => (erroLink.value = ''))
watch(categoria, (c) => {
  erroCategoria.value = ''
  try { localStorage.setItem(`categoria:${token}`, c) } catch {}
})

// Lembra a última categoria usada neste link
onMounted(() => {
  try {
    const salva = localStorage.getItem(`categoria:${token}`)
    if (salva && form.value?.categorias.some(c => c.id === salva)) categoria.value = salva
  } catch {}
})

async function colar() {
  try {
    const texto = await navigator.clipboard.readText()
    if (!texto) throw new Error('vazio')
    link.value = texto.trim()
  } catch {
    toast.info('Não deu para colar automaticamente', 'Toque e segure no campo e escolha "Colar".')
  }
}

async function salvar() {
  if (salvando.value || salvo.value) return
  if (!categoria.value) {
    erroCategoria.value = 'Escolha para quais grupos a oferta vai'
    return
  }
  if (!plataforma.value) {
    erroLink.value = link.value ? 'Esse não parece um link válido (precisa começar com https://)' : 'Cole o link de afiliado'
    return
  }
  const linkNormalizado = normalizarLink(link.value)
  if (enviadas.value.some(e => e.link === linkNormalizado)) {
    erroLink.value = 'Você já enviou esse link agora há pouco'
    return
  }

  salvando.value = true
  let oferta: { id: string, status: string }
  try {
    oferta = await $fetch(`/api/publico/formulario/${token}`, {
      method: 'POST',
      body: { categoriaId: categoria.value, link: linkNormalizado }
    })
  } catch (e) {
    salvando.value = false
    const { statusCode, statusMessage } = e as { statusCode?: number, statusMessage?: string }
    if (statusCode === 404) linkInvalido.value = true
    else if (statusCode === 409) erroLink.value = 'Esse link já foi enviado antes'
    else if (statusCode === 429) toast.erro('Muitas ofertas em pouco tempo', 'Espere um minuto e tente de novo.')
    else if (statusMessage === 'categoria_invalida') erroCategoria.value = 'Essa categoria não está mais disponível'
    else if (statusMessage === 'link_invalido_oferta') erroLink.value = 'Esse não parece um link válido'
    else toast.erro('Não foi possível enviar', 'Verifique sua internet e tente de novo.')
    return
  }
  salvando.value = false
  salvo.value = true
  disparar(botao.value?.$el ?? null)
  navigator.vibrate?.(30)

  enviadas.value.unshift({
    id: oferta.id,
    link: linkNormalizado,
    plataforma: plataforma.value,
    categoria: nomeCategoria.value,
    status: oferta.status as StatusPostagem,
    titulo: null
  })
  setTimeout(() => {
    salvo.value = false
    link.value = ''
  }, 1600)
}

// Acompanha o andamento das ofertas enviadas nesta sessão
let consulta: ReturnType<typeof setInterval> | undefined
async function atualizarStatus() {
  const pendentes = enviadas.value.filter(e => e.status === 'pendente' || e.status === 'aprovada')
  if (!pendentes.length) return
  try {
    const lista = await $fetch(`/api/publico/formulario/${token}/status`, { query: { ids: pendentes.map(e => e.id).join(',') } })
    for (const s of lista) {
      const e = enviadas.value.find(x => x.id === s.id)
      if (e) Object.assign(e, { status: s.status as StatusPostagem, titulo: s.titulo })
    }
  } catch {}
}
onMounted(() => (consulta = setInterval(atualizarStatus, 5000)))
onBeforeUnmount(() => clearInterval(consulta))
</script>

<template>
  <!-- Link inválido -->
  <div v-if="!form || linkInvalido" class="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <span class="mb-5 flex size-16 animate-pop items-center justify-center rounded-full bg-status-rejeitada/10 text-status-rejeitada">
      <UiIcone nome="link" :tamanho="28" />
    </span>
    <h1 class="animate-fade-up text-title [animation-delay:80ms]">Esse link não funciona mais</h1>
    <p class="mt-2 max-w-xs animate-fade-up text-muted [animation-delay:160ms]">
      Ele pode ter sido desativado. Peça um link novo para quem te enviou.
    </p>
  </div>

  <div v-else class="mx-auto flex min-h-dvh max-w-md flex-col">
    <!-- Cabeçalho -->
    <header class="flex items-center gap-3 px-4 pb-2 pt-[max(20px,env(safe-area-inset-top))]">
      <span class="flex size-11 shrink-0 animate-pop items-center justify-center rounded-full bg-fg text-[18px] font-semibold text-bg">
        {{ form.dono.charAt(0) }}
      </span>
      <div class="min-w-0 animate-fade-up">
        <p class="truncate font-semibold">{{ form.dono }}</p>
        <p class="truncate text-label text-muted">Enviando como {{ form.nomeLink }}</p>
      </div>
    </header>

    <form id="form-oferta" class="flex flex-1 flex-col gap-4 px-4 pb-40 pt-6" @submit.prevent="salvar">
      <div class="mb-2 animate-fade-up [animation-delay:60ms]">
        <h1 class="text-[26px] font-semibold leading-8 tracking-tight">Nova oferta</h1>
        <p class="mt-1 text-muted">Escolha a categoria e cole o link de afiliado.</p>
      </div>

      <p v-if="!form.categorias.length" class="flex animate-fade-up items-start gap-2 rounded border border-line bg-surface p-3 text-label">
        <UiIcone nome="info" :tamanho="16" class="mt-0.5 shrink-0 text-muted" />
        Ainda não há categorias para escolher. Peça para {{ form.dono }} criar uma no painel.
      </p>
      <div class="animate-fade-up [animation-delay:120ms]">
        <UiSelecao
          v-model="categoria"
          rotulo="Categoria"
          placeholder="Selecione a categoria"
          :opcoes="opcoesCategoria"
          :erro="erroCategoria"
        />
      </div>

      <div class="animate-fade-up [animation-delay:180ms]">
        <UiCampo
          v-model="link"
          rotulo="Link de afiliado"
          type="url"
          inputmode="url"
          :erro="erroLink"
          dica="Gere o link no app ou painel de afiliado da loja."
        >
          <template #fim>
            <Transition name="marcado" mode="out-in">
              <span
                v-if="plataforma"
                :key="plataforma"
                class="flex size-8 items-center justify-center rounded-full bg-fg text-bg"
              >
                <UiIcone nome="check" :tamanho="16" :traco="3" />
              </span>
              <button
                v-else
                type="button"
                class="flex h-9 items-center gap-1.5 rounded bg-fg px-3 text-label font-semibold text-bg transition-transform active:scale-95"
                @click="colar"
              >
                <UiIcone nome="copiar" :tamanho="14" /> Colar
              </button>
            </Transition>
          </template>
        </UiCampo>
        <div class="mt-3 h-7">
          <Transition name="marcado">
            <UiBadgePlataforma v-if="plataforma" :plataforma="plataforma" />
          </Transition>
        </div>
      </div>

      <!-- Enviadas nesta sessão -->
      <section v-if="enviadas.length" class="flex flex-col gap-2">
        <p class="text-label font-semibold text-muted">Enviadas agora</p>
        <TransitionGroup name="lista" tag="ul" class="flex flex-col gap-2">
          <li v-for="e in enviadas" :key="e.id" class="flex items-center gap-3 rounded border border-line bg-surface p-3">
            <span
              class="size-2.5 shrink-0 rounded-full"
              :style="{ background: corPlataforma(e.plataforma) }"
            />
            <span class="min-w-0 flex-1">
              <span v-if="e.titulo" class="block truncate text-label font-semibold">{{ e.titulo }}</span>
              <span v-else class="block truncate font-mono text-label">{{ e.link.replace(/^https?:\/\//, '') }}</span>
              <span class="block text-label text-muted">{{ e.categoria }}</span>
            </span>
            <Transition name="marcado" mode="out-in">
              <UiStatus :key="e.status" :status="e.status" />
            </Transition>
          </li>
        </TransitionGroup>
      </section>
    </form>

    <!-- Botão fixo no alcance do polegar -->
    <div class="fixed inset-x-0 bottom-0 z-30">
      <div class="mx-auto max-w-md bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8">
        <UiBotao ref="botao" form="form-oferta" type="submit" tamanho="lg" bloco :carregando="salvando" :sucesso="salvo">
          <UiIcone nome="enviar" :tamanho="18" /> Salvar oferta
          <template #carregando>Enviando…</template>
          <template #sucesso>Oferta na fila!</template>
        </UiBotao>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marcado-enter-active { transition: opacity .2s ease, transform .4s cubic-bezier(.34, 1.56, .64, 1); }
.marcado-leave-active { transition: opacity .12s ease, transform .12s ease; }
.marcado-enter-from { opacity: 0; transform: scale(.4); }
.marcado-leave-to { opacity: 0; transform: scale(.8); }

.lista-enter-active { transition: opacity .3s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1); }
.lista-enter-from { opacity: 0; transform: translateY(-12px) scale(.96); }
.lista-move { transition: transform .4s cubic-bezier(.22, 1, .36, 1); }
</style>
