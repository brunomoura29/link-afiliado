<script setup lang="ts">
// Temporário: telas do painel que ainda não foram feitas.
definePageMeta({ layout: 'painel', pageTransition: { name: 'pagina', mode: 'out-in' } })

const rota = useRoute()
const NOMES: Record<string, string> = {
  ofertas: 'Ofertas', grupos: 'Grupos', links: 'Links', whatsapp: 'WhatsApp',
  categorias: 'Categorias', leads: 'Leads', configuracoes: 'Configurações'
}
const nome = computed(() => NOMES[String((rota.params.secao as string[])[0])] ?? 'Página')
useHead({ title: () => `${nome.value} · LinkAfiliado` })
</script>

<template>
  <div class="flex min-h-[60dvh] flex-col items-center justify-center text-center">
    <span class="mb-5 flex size-16 animate-pop items-center justify-center rounded-full bg-surface text-muted">
      <UiIcone nome="relogio" :tamanho="28" />
    </span>
    <h1 class="animate-fade-up text-title [animation-delay:80ms]">{{ nome }}</h1>
    <p class="mt-1 animate-fade-up text-muted [animation-delay:140ms]">Essa tela é a próxima da lista.</p>
  </div>
</template>
