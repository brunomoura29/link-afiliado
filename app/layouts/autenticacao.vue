<script setup lang="ts">
const { escuro, alternar } = useTema()
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
    <!-- Esquerda: a solução (só a partir de lg; no celular o formulário vem primeiro) -->
    <aside class="sticky top-0 hidden h-dvh overflow-y-auto overflow-x-hidden bg-[#0d0d0d] [scrollbar-width:none] text-white lg:block dark:border-r dark:border-line">
      <AuthVitrine />
    </aside>

    <!-- Direita: formulário -->
    <main class="relative flex min-h-dvh flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      <div class="flex items-center justify-between">
        <Logo class="lg:invisible" />
        <button
          type="button"
          :aria-label="escuro ? 'Usar tema claro' : 'Usar tema escuro'"
          class="flex size-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-surface"
          @click="alternar"
        >
          <UiIcone :nome="escuro ? 'sol' : 'lua'" :tamanho="18" />
        </button>
      </div>

      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <slot />
      </div>

      <p class="text-center text-[12px] text-muted">© LinkAfiliado · Feito para afiliados</p>
    </main>
  </div>
</template>
