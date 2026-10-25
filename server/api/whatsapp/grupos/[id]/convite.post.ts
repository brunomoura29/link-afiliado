import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Busca o convite atual de um grupo na UazAPI e grava em whatsapp_destinos.
// Só leitura no WhatsApp (não revoga o convite). Exige o número como admin do grupo.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: grupo } = await admin.from('whatsapp_destinos').select('jid, admin').eq('id', id).eq('owner_id', usuario.sub).eq('tipo', 'grupo').maybeSingle()
  if (!grupo) throw createError({ statusCode: 404, statusMessage: 'nao_encontrado' })
  if (!grupo.admin) throw createError({ statusCode: 409, statusMessage: 'nao_admin', message: 'O número conectado não é admin deste grupo.' })

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de buscar o convite.' })

  let convite
  try {
    convite = await obterConvite(cred.token, grupo.jid)
  } catch (e) {
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Tente de novo.' : e.message })
    }
    throw e
  }
  if (!convite) throw createError({ statusCode: 502, statusMessage: 'sem_convite', message: 'O WhatsApp não devolveu o convite deste grupo.' })

  await admin.from('whatsapp_destinos').update({ convite_url: convite }).eq('id', id)
  return { convite }
})
