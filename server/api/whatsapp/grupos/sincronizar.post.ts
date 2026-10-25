import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Botão "Atualizar" da tela de Grupos: lê os grupos do WhatsApp do usuário na UazAPI
// e grava em whatsapp_destinos. Só leitura no WhatsApp — não altera nenhum grupo.
// O que o usuário configurou (categoria, ordem, receber ofertas) é preservado.

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

  const { data: existentes } = await admin.from('whatsapp_destinos').select('id, jid, categoria_id, nome, descricao, so_admins, convite_url, foto_url, editado_no_app_em').eq('owner_id', usuario.sub).eq('tipo', 'grupo')
  const porJid = new Map((existentes ?? []).map(d => [d.jid, d]))

  // Atualiza/insere só os dados que vêm do WhatsApp (categoria/ordem/recebe_ofertas ficam como estão)
  const linhas = grupos.map(g => ({
    owner_id: usuario.sub,
    jid: g.jid,
    tipo: 'grupo',
    ...dadosDaListagem(g, porJid.get(g.jid))
  }))
  if (linhas.length) {
    const { error } = await admin.from('whatsapp_destinos').upsert(linhas, { onConflict: 'owner_id,jid' })
    if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar' })
  }

  // Convite que falta nos grupos que entram na rotação (admin + com categoria). Cada um
  // leva alguns segundos, então só esses — os outros buscam ao entrar numa categoria.
  const semConvite = linhas.filter(l => l.admin && !l.convite_url && porJid.get(l.jid)?.categoria_id)
  for (let i = 0; i < semConvite.length; i += 4) {
    await Promise.all(semConvite.slice(i, i + 4).map(async (l) => {
      const convite = await obterConvite(cred.token, l.jid).catch(() => null)
      if (convite) await admin.from('whatsapp_destinos').update({ convite_url: convite }).eq('owner_id', usuario.sub).eq('jid', l.jid)
    }))
  }

  // Grupos que sumiram (o número saiu ou foi removido): apaga. Só quando a lista veio
  // com algo, para uma resposta vazia por falha não apagar tudo.
  const atuais = new Set(grupos.map(g => g.jid))
  const sairam = [...porJid.values()].filter(d => !atuais.has(d.jid)).map(d => d.id)
  if (grupos.length && sairam.length) await admin.from('whatsapp_destinos').delete().in('id', sairam)

  return {
    total: grupos.length,
    novos: grupos.filter(g => !porJid.has(g.jid)).length,
    removidos: grupos.length ? sairam.length : 0,
    comoAdmin: grupos.filter(g => g.admin).length
  }
})
