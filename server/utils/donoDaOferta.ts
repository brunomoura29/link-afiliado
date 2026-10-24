import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Rotas do painel que mexem numa oferta: exige login e que a oferta seja do usuário.
export async function exigirDonoDaOferta(event: H3Event) {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const id = getRouterParam(event, 'id') ?? ''
  const admin = serverSupabaseServiceRole(event)
  const { data: oferta } = await admin.from('ofertas').select('*').eq('id', id).maybeSingle()
  if (!oferta || oferta.owner_id !== usuario.sub) throw createError({ statusCode: 404, statusMessage: 'oferta_nao_encontrada' })
  return oferta
}
