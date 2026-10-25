import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Liga/desliga "só admins enviam mensagens" num grupo do WhatsApp e grava em whatsapp_destinos.
// Altera o grupo de verdade. Exige o número como admin do grupo.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const corpo = await readBody<{ ativo?: boolean }>(event)
  if (typeof corpo?.ativo !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'ativo_invalido' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: grupo } = await admin.from('whatsapp_destinos').select('jid, admin').eq('id', id).eq('owner_id', usuario.sub).eq('tipo', 'grupo').maybeSingle()
  if (!grupo) throw createError({ statusCode: 404, statusMessage: 'nao_encontrado' })
  if (!grupo.admin) throw createError({ statusCode: 409, statusMessage: 'nao_admin', message: 'O número conectado não é admin deste grupo.' })

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de mudar o grupo.' })

  let soAdmins
  try {
    soAdmins = await definirSoAdmins(cred.token, grupo.jid, corpo.ativo)
  } catch (e) {
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Tente de novo.' : e.message })
    }
    throw e
  }

  await admin.from('whatsapp_destinos').update({ so_admins: soAdmins, editado_no_app_em: new Date().toISOString() }).eq('id', id)
  return { soAdmins }
})
