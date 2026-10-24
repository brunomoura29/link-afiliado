import { serverSupabaseServiceRole } from '#supabase/server'

// Status das ofertas enviadas nesta sessão do formulário (?ids=a,b,c).
// Só devolve ofertas que vieram por este mesmo link.
export default defineEventHandler(async (event) => {
  const link = await linkPorToken(event, getRouterParam(event, 'token') ?? '')
  const ids = String(getQuery(event).ids ?? '')
    .split(',')
    .filter(id => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50)
  if (!ids.length) return []

  const admin = serverSupabaseServiceRole(event)
  const { data } = await admin
    .from('ofertas')
    .select('id, status, titulo')
    .eq('link_formulario_id', link.id)
    .in('id', ids)
  return data ?? []
})
