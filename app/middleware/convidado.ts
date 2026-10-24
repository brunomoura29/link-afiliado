// Login e cadastro: quem já está logado vai direto para o painel.
export default defineNuxtRouteMiddleware(() => {
  if (useSupabaseUser().value) return navigateTo('/painel')
})
