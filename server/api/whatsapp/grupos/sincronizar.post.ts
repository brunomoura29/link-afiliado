import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Botão "Atualizar" da tela de Grupos: lê os grupos do WhatsApp do usuário na UazAPI
// e grava em whatsapp_destinos. Só leitura no WhatsApp — não altera nenhum grupo.
// O que o usuário configurou (categoria, ordem, receber ofertas) é preservado.
const CONVITE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/

export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de buscar os grupos.' })

  let grupos
  try {
    const status = await statusInstancia(cred.token)
    if (!status.conectado) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'O WhatsApp está desconectado. Conecte para buscar os grupos.' })
    grupos = await listarGrupos(cred.token)
  } catch (e) {
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Tente de novo.' : e.message })
    }
    throw e
  }

  const agora = new Date().toISOString()
  const { data: existentes } = await admin.from('whatsapp_destinos').select('id, jid').eq('owner_id', usuario.sub).eq('tipo', 'grupo')
  const porJid = new Map((existentes ?? []).map(d => [d.jid, d.id]))

  // Atualiza/insere só os dados que vêm do WhatsApp (categoria/ordem/recebe_ofertas ficam como estão)
  const linhas = grupos.map(g => ({
    owner_id: usuario.sub,
    jid: g.jid,
    tipo: 'grupo',
    nome: g.nome,
    membros: g.membros,
    admin: g.admin,
    pode_enviar: g.podeEnviar,
    so_admins: g.soAdmins,
    convite_url: g.convite && CONVITE.test(g.convite) ? g.convite : null,
    foto_url: g.foto,
    sincronizado_em: agora
  }))
  if (linhas.length) {
    const { error } = await admin.from('whatsapp_destinos').upsert(linhas, { onConflict: 'owner_id,jid' })
    if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar' })
  }

  // Grupos que sumiram (o número saiu ou foi removido): apaga. Só quando a lista veio
  // com algo, para uma resposta vazia por falha não apagar tudo.
  const atuais = new Set(grupos.map(g => g.jid))
  const sairam = [...porJid.entries()].filter(([jid]) => !atuais.has(jid)).map(([, id]) => id)
  if (grupos.length && sairam.length) await admin.from('whatsapp_destinos').delete().in('id', sairam)

  return {
    total: grupos.length,
    novos: grupos.filter(g => !porJid.has(g.jid)).length,
    removidos: grupos.length ? sairam.length : 0,
    comoAdmin: grupos.filter(g => g.admin).length
  }
})
