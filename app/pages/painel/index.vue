<script setup lang="ts">
definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })
useHead({ title: 'Início · LinkAfiliado' })

const toast = useToast()
const usuario = USUARIO_EXEMPLO // TODO: dados reais do Supabase
const { estado: whatsapp, conectado: whatsappConectado } = useWhatsapp()
const painel = PAINEL_EXEMPLO
const { ofertas } = useOfertas()
const { categorias } = useGrupos()
const ultimas = computed(() => [...ofertas.value].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, 4))
const nomeCategoria = (id: string) => categorias.value.find(c => c.id === id)?.nome ?? 'Sem categoria'
const primeiroNome = usuario.nome.split(' ')[0]

// Saudação pelo horário do aparelho (só no cliente, para não divergir do servidor)
const saudacao = ref('Olá')
onMounted(() => {
  const h = new Date().getHours()
  saudacao.value = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
})

const NUMEROS = [
  { rotulo: 'Ofertas hoje', valor: painel.hoje.ofertas, icone: 'sacola' },
  { rotulo: 'Enviadas hoje', valor: painel.hoje.enviadas, icone: 'enviar' },
  { rotulo: 'Na fila', valor: painel.hoje.naFila, icone: 'relogio' },
  { rotulo: 'Cliques nos grupos', valor: painel.hoje.cliquesEntrada, icone: 'usuarios' }
] as const

const copiado = ref('')
async function copiar(texto: string, chave: string) {
  try { await navigator.clipboard.writeText(texto) } catch {}
  copiado.value = chave
  toast.sucesso('Link copiado')
  setTimeout(() => copiado.value === chave && (copiado.value = ''), 1500)
}

// No celular abre o menu nativo de compartilhar (WhatsApp, Instagram…)
async function compartilhar(titulo: string, url: string, chave: string) {
  if (navigator.share) {
    try { await navigator.share({ title: titulo, url }) } catch {}
  } else {
    copiar(url, chave)
  }
}

const LINKS = [
  { chave: 'form', titulo: 'Formulário do assistente', descricao: 'Mande para quem vai cadastrar as ofertas.', url: painel.linkFormulario, icone: 'link' },
  { chave: 'entrada', titulo: 'Entrada no grupo', descricao: 'Divulgue nas redes para ganhar membros.', url: painel.linkEntrada, icone: 'usuarios' }
] as const
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Saudação -->
    <header>
      <h1 class="animate-fade-up text-[26px] font-semibold leading-8 tracking-tight">{{ saudacao }}, {{ primeiroNome }} 👋</h1>
      <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Veja como estão suas ofertas hoje.</p>
    </header>

    <!-- Status do WhatsApp -->
    <NuxtLink
      to="/painel/whatsapp"
      class="group flex animate-fade-up items-center gap-4 rounded-lg border p-4 transition-colors [animation-delay:100ms]"
      :class="whatsappConectado ? 'border-whatsapp/40 bg-whatsapp/[.06]' : 'border-status-rejeitada/40 bg-status-rejeitada/5'"
    >
      <span class="relative flex size-11 shrink-0 items-center justify-center rounded-full" :class="whatsappConectado ? 'bg-whatsapp text-[#0b3d1f]' : 'bg-status-rejeitada text-white'">
        <span v-if="whatsappConectado" class="absolute inset-0 animate-ring-out rounded-full bg-whatsapp" />
        <UiIcone nome="celular" :tamanho="20" class="relative" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">{{ whatsappConectado ? 'WhatsApp conectado' : 'WhatsApp desconectado' }}</span>
        <span class="block truncate text-label text-muted">
          {{ whatsappConectado ? `${whatsapp.numero} · enviando normalmente` : 'Conecte para voltar a enviar' }}
        </span>
      </span>
      <UiIcone nome="seta-direita" :tamanho="18" class="text-muted transition-transform duration-300 ease-spring group-hover:translate-x-1" />
    </NuxtLink>

    <!-- Números do dia -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <UiCard
        v-for="(n, i) in NUMEROS"
        :key="n.rotulo"
        class="animate-fade-up p-4"
        :style="{ animationDelay: `${140 + i * 50}ms` }"
      >
        <div class="flex items-center justify-between text-muted">
          <span class="text-label">{{ n.rotulo }}</span>
          <UiIcone :nome="n.icone" :tamanho="16" />
        </div>
        <p class="mt-2 text-[28px] font-semibold leading-9"><UiContador :valor="n.valor" /></p>
      </UiCard>
    </section>

    <!-- Links para compartilhar -->
    <section class="grid gap-3 lg:grid-cols-2">
      <UiCard v-for="(l, i) in LINKS" :key="l.chave" v-reveal="i * 80" class="flex flex-col gap-3 p-4">
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface"><UiIcone :nome="l.icone" :tamanho="18" /></span>
          <div class="min-w-0">
            <p class="font-semibold">{{ l.titulo }}</p>
            <p class="text-label text-muted">{{ l.descricao }}</p>
          </div>
        </div>
        <p class="truncate rounded bg-surface px-3 py-2 font-mono text-label text-muted">{{ l.url.replace('https://', '') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <UiBotao variante="secundario" tamanho="sm" @click="copiar(l.url, l.chave)">
            <UiIcone :nome="copiado === l.chave ? 'check' : 'copiar'" :tamanho="16" />
            {{ copiado === l.chave ? 'Copiado' : 'Copiar' }}
          </UiBotao>
          <UiBotao tamanho="sm" @click="compartilhar(l.titulo, l.url, l.chave)">
            <UiIcone nome="compartilhar" :tamanho="16" /> Compartilhar
          </UiBotao>
        </div>
      </UiCard>
    </section>

    <!-- Últimas ofertas -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 v-reveal class="font-semibold">Últimas ofertas</h2>
        <NuxtLink to="/painel/ofertas" class="flex items-center gap-1 text-label font-semibold text-muted transition-colors hover:text-fg">
          Ver todas <UiIcone nome="seta-direita" :tamanho="14" />
        </NuxtLink>
      </div>
      <UiCard class="divide-y divide-line overflow-hidden">
        <NuxtLink v-for="(o, i) in ultimas" :key="o.id" v-reveal="i * 60" to="/painel/ofertas" class="flex items-center gap-3 p-4 transition-colors hover:bg-surface/60">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: corPlataforma(o.plataforma) }" />
          <div class="min-w-0 flex-1">
            <p class="truncate">{{ o.titulo ?? 'Lendo o produto…' }}</p>
            <p class="truncate text-label text-muted">
              <template v-if="o.preco != null">{{ formatarPreco(o.preco) }} · </template>{{ nomeCategoria(o.categoriaId) }} · {{ tempoRelativo(o.criadaEm) }}
            </p>
          </div>
          <UiStatus :status="o.status" class="shrink-0" />
        </NuxtLink>
      </UiCard>
    </section>
  </div>
</template>
