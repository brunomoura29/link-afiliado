import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Botão "Atualizar do WhatsApp" do modal do grupo: relê este grupo na UazAPI (pela listagem —
// a única leitura com "só admins" certo) e grava. Só leitura no WhatsApp.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: existente } = await admin.from('whatsapp_destinos')
    .select('jid, nome, descricao, so_admins, convite_url, foto_url, editado_no_app_em')
    .eq('id', id).eq('owner_id', usuario.sub).eq('tipo', 'grupo').maybeSingle()
  if (!existente) throw createError({ statusCode: 404, statusMessage: 'nao_encontrado' })

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de atualizar.' })

  let grupos
  try {
    grupos = await listarGrupos(cred.token)
  } catch (e) {
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Tente de novo.' : e.message })
    }
    throw e
  }
  const g = grupos.find(x => x.jid === existente.jid)
  if (!g) throw createError({ statusCode: 410, statusMessage: 'saiu_do_grupo', message: 'O número conectado não está mais neste grupo. Toque em "Atualizar" na tela de Grupos para tirá-lo da lista.' })

  const dados = dadosDaListagem(g, existente)
  const { data: linha, error } = await admin.from('whatsapp_destinos').update(dados).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar' })
  // recente: o app mexeu há pouco, então parte do que veio ainda é o que o app gravou
  const recente = !!existente.editado_no_app_em && Date.now() - new Date(existente.editado_no_app_em).getTime() < JANELA_EDICAO_APP
  return { linha, recente }
})
