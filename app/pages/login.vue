<script setup lang="ts">
definePageMeta({ layout: 'autenticacao', middleware: 'convidado', pageTransition: { name: 'auth', mode: 'out-in' } })
useHead({ title: 'Entrar · LinkAfiliado' })

const toast = useToast()
const supabase = useSupabaseClient()
const redirecionamento = useSupabaseCookieRedirect()

const usuario = ref('')
const senha = ref('')
const erros = reactive({ usuario: '', senha: '' })
const entrando = ref(false)
const entrou = ref(false)

watch(usuario, () => (erros.usuario = ''))
watch(senha, () => (erros.senha = ''))


async function entrar() {
  erros.usuario = !usuario.value ? 'Informe seu e-mail ou telefone'
    : !ehEmail(usuario.value) && !ehTelefone(usuario.value) ? 'E-mail ou telefone inválido' : ''
  erros.senha = !senha.value ? 'Informe sua senha' : ''
  if (erros.usuario || erros.senha) return

  entrando.value = true
  const codigo = ehEmail(usuario.value) ? await entrarComEmail() : await entrarComTelefone()
  entrando.value = false
  if (codigo === 'invalid_credentials') {
    erros.senha = 'E-mail, telefone ou senha incorretos'
    return
  }
  if (codigo) {
    toast.erro('Não foi possível entrar', codigo === 'over_request_rate_limit'
      ? 'Muitas tentativas. Espere um pouco e tente de novo.'
      : 'Verifique sua internet e tente de novo.')
    return
  }

  entrou.value = true
  await new Promise(r => setTimeout(r, 500))
  // Volta para a página que a pessoa tentou abrir antes do login (se houver)
  const destino = redirecionamento.pluck() || '/painel'
  // Recarrega para o navegador pegar a sessão que o servidor gravou nos cookies (login por telefone)
  reloadNuxtApp({ path: destino })
}

// Devolvem '' quando deu certo, ou o código do erro
async function entrarComEmail() {
  const { error } = await supabase.auth.signInWithPassword({ email: usuario.value.trim(), password: senha.value })
  return error ? (error.code ?? 'desconhecido') : ''
}

async function entrarComTelefone() {
  try {
    await $fetch('/api/auth/login-telefone', { method: 'POST', body: { telefone: usuario.value, senha: senha.value } })
    return ''
  } catch (e) {
    return (e as { statusCode?: number }).statusCode === 401 ? 'invalid_credentials' : 'desconhecido'
  }
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
          :formatar="formatarEmailOuTelefone"
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
