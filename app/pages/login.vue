<script setup lang="ts">
definePageMeta({ layout: 'autenticacao', pageTransition: { name: 'auth', mode: 'out-in' } })
useHead({ title: 'Entrar · LinkAfiliado' })

const toast = useToast()

const usuario = ref('')
const senha = ref('')
const erros = reactive({ usuario: '', senha: '' })
const entrando = ref(false)
const entrou = ref(false)

watch(usuario, () => (erros.usuario = ''))
watch(senha, () => (erros.senha = ''))

// Se só tiver dígitos/pontuação de telefone, formata enquanto digita
watch(usuario, (v) => {
  if (/^[\d()\s-]+$/.test(v)) {
    const f = formatarTelefone(v)
    if (f !== v) usuario.value = f
  }
})

async function entrar() {
  erros.usuario = !usuario.value ? 'Informe seu e-mail ou telefone'
    : !ehEmail(usuario.value) && !ehTelefone(usuario.value) ? 'E-mail ou telefone inválido' : ''
  erros.senha = !senha.value ? 'Informe sua senha' : ''
  if (erros.usuario || erros.senha) return

  entrando.value = true
  await new Promise(r => setTimeout(r, 1200)) // TODO: Supabase Auth
  entrando.value = false
  entrou.value = true
  await new Promise(r => setTimeout(r, 600))
  await navigateTo('/painel')
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="animate-fade-up text-[28px] font-semibold leading-9 tracking-tight">Bem-vindo de volta</h1>
      <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Entre para acompanhar suas ofertas e grupos.</p>
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="entrar">
      <div class="animate-fade-up [animation-delay:120ms]">
        <UiCampo
          v-model="usuario"
          rotulo="E-mail ou telefone"
          autocomplete="username"
          inputmode="email"
          :erro="erros.usuario"
        />
      </div>
      <div class="animate-fade-up [animation-delay:180ms]">
        <UiCampoSenha v-model="senha" :erro="erros.senha" />
      </div>

      <div class="-mt-1 flex justify-end animate-fade-up [animation-delay:220ms]">
        <button
          type="button"
          class="text-label font-semibold text-muted transition-colors hover:text-fg"
          @click="toast.info('Em breve', 'A recuperação de senha entra junto com o backend.')"
        >
          Esqueci minha senha
        </button>
      </div>

      <div class="animate-fade-up [animation-delay:260ms]">
        <UiBotao type="submit" tamanho="lg" bloco :carregando="entrando" :sucesso="entrou">
          Entrar
          <template #carregando>Entrando…</template>
          <template #sucesso>Tudo certo!</template>
        </UiBotao>
      </div>
    </form>

    <p class="mt-8 animate-fade-up text-center text-muted [animation-delay:320ms]">
      Novo por aqui?
      <NuxtLink to="/cadastro" class="font-semibold text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-fg">
        Criar conta grátis
      </NuxtLink>
    </p>
  </div>
</template>
