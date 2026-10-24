import type { Tables } from '~/types/database.types'

// Perfil do usuário logado (tabela perfis, criada pelo gatilho no cadastro).
export function usePerfil() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  const perfil = useState<Tables<'perfis'> | null>('perfil', () => null)

  async function carregar() {
    if (!usuario.value?.sub) return null
    const { data } = await supabase.from('perfis').select('*').eq('id', usuario.value.sub).maybeSingle()
    perfil.value = data
    return data
  }

  // Enquanto o perfil não chega, usa o que veio no token
  const nome = computed(() => perfil.value?.nome || (usuario.value?.user_metadata?.nome as string | undefined) || '')
  const email = computed(() => perfil.value?.email || usuario.value?.email || '')
  const primeiroNome = computed(() => nome.value.split(' ')[0] || '')
  const iniciais = computed(() => (nome.value || email.value).split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase())

  async function sair() {
    await supabase.auth.signOut()
    perfil.value = null
    await navigateTo('/login')
  }

  return { perfil, nome, email, primeiroNome, iniciais, carregar, sair }
}
