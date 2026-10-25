import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Status do WhatsApp do usuário logado, lido na UazAPI e espelhado em whatsapp_conexoes.
// Nunca devolve o token. QR/código de pareamento só vêm enquanto está conectando.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) return { situacao: 'sem_instancia' as const }

  let s
  try {
    s = await statusInstancia(cred.token)
  } catch (e) {
    if (e instanceof ErroUazapi && (e.status === 401 || e.status === 404)) {
      return { situacao: 'instancia_invalida' as const, mensagem: 'A instância do WhatsApp não foi encontrada na UazAPI.' }
    }
    throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e instanceof Error ? e.message : 'Falha na UazAPI' })
  }

  // connected → conectado; connecting → aguardando; disconnected/hibernated → desconectado
  const status = s.conectado ? 'conectado' : s.status === 'connecting' ? 'aguardando' : 'desconectado'
  const { data: antes } = await admin.from('whatsapp_conexoes').select('status, conectado_em').eq('owner_id', usuario.sub).maybeSingle()
  const conectadoEm = status === 'conectado'
    ? (antes?.status === 'conectado' && antes.conectado_em ? antes.conectado_em : new Date().toISOString())
    : null
  await admin.from('whatsapp_conexoes').upsert({
    owner_id: usuario.sub,
    status,
    numero: s.numero,
    nome_perfil: s.nomePerfil,
    conectado_em: conectadoEm
  })

  return {
    situacao: 'ok' as const,
    status,
    numero: s.numero,
    nomePerfil: s.nomePerfil,
    foto: s.foto,
    conectadoEm,
    qrcode: status === 'aguardando' ? s.qrcode : null,
    paircode: status === 'aguardando' ? s.paircode : null,
    motivoDesconexao: status === 'desconectado' ? s.motivoDesconexao : null
  }
})
