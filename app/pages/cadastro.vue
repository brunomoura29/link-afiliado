<script setup lang="ts">
definePageMeta({ layout: 'autenticacao', pageTransition: { name: 'auth', mode: 'out-in' } })
useHead({ title: 'Criar conta · LinkAfiliado' })

const { disparar } = useConfete()

const dados = reactive({ nome: '', email: '', telefone: '', senha: '' })
const erros = reactive({ nome: '', email: '', telefone: '', senha: '' })
const criando = ref(false)
const criado = ref(false)
const botao = ref<{ $el: HTMLElement }>()

for (const campo of Object.keys(dados) as (keyof typeof dados)[]) {
  watch(() => dados[campo], () => (erros[campo] = ''))
}
watch(() => dados.telefone, (v) => {
  const f = formatarTelefone(v)
  if (f !== v) dados.telefone = f
})

async function criar() {
  erros.nome = dados.nome.trim().length < 2 ? 'Informe seu nome' : ''
  erros.email = !ehEmail(dados.email) ? 'Informe um e-mail válido' : ''
  erros.telefone = !ehTelefone(dados.telefone) ? 'Informe o celular com DDD' : ''
  erros.senha = dados.senha.length < 8 ? 'A senha precisa ter pelo menos 8 caracteres' : ''
  if (Object.values(erros).some(Boolean)) return

  criando.value = true
  await new Promise(r => setTimeout(r, 1400)) // TODO: Supabase Auth (signUp) + perfil com nome e telefone
  criando.value = false
  criado.value = true
  disparar(botao.value?.$el ?? null, 40)
  await new Promise(r => setTimeout(r, 900))
  await navigateTo('/painel')
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="animate-fade-up text-[28px] font-semibold leading-9 tracking-tight">Crie sua conta</h1>
      <p class="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Leva menos de um minuto. Depois é só conectar seu WhatsApp.</p>
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="criar">
      <div class="animate-fade-up [animation-delay:100ms]">
        <UiCampo v-model="dados.nome" rotulo="Nome" autocomplete="name" :erro="erros.nome" />
      </div>
      <div class="animate-fade-up [animation-delay:150ms]">
        <UiCampo v-model="dados.email" rotulo="E-mail" type="email" inputmode="email" autocomplete="email" :erro="erros.email" />
      </div>
      <div class="animate-fade-up [animation-delay:200ms]">
        <UiCampo v-model="dados.telefone" rotulo="Celular com DDD" type="tel" inputmode="tel" autocomplete="tel-national" :erro="erros.telefone" />
      </div>
      <div class="animate-fade-up [animation-delay:250ms]">
        <UiCampoSenha v-model="dados.senha" nova :erro="erros.senha" />
      </div>

      <div class="mt-2 animate-fade-up [animation-delay:300ms]">
        <UiBotao ref="botao" type="submit" tamanho="lg" bloco :carregando="criando" :sucesso="criado">
          Criar conta
          <template #carregando>Criando sua conta…</template>
          <template #sucesso>Conta criada!</template>
        </UiBotao>
      </div>

      <p class="animate-fade-up text-center text-[12px] leading-[18px] text-muted [animation-delay:340ms]">
        Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade.
      </p>
    </form>

    <p class="mt-8 animate-fade-up text-center text-muted [animation-delay:380ms]">
      Já tem conta?
      <NuxtLink to="/login" class="font-semibold text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-fg">
        Entrar
      </NuxtLink>
    </p>
  </div>
</template>
