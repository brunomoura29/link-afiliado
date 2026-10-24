import { serverSupabaseServiceRole } from '#supabase/server'

// Dados para abrir o formulário público: quem é o dono e as categorias ativas dele.
export default defineEventHandler(async (event) => {
  const link = await linkPorToken(event, getRouterParam(event, 'token') ?? '')
  const admin = serverSupabaseServiceRole(event)

  const [perfil, categorias] = await Promise.all([
    admin.from('perfis').select('nome').eq('id', link.owner_id).maybeSingle(),
    admin.from('categorias').select('id, nome, emoji').eq('owner_id', link.owner_id).eq('ativa', true).order('criado_em')
  ])

  return {
    dono: perfil.data?.nome || 'Formulário de ofertas',
    nomeLink: link.nome,
    categorias: categorias.data ?? []
  }
})
