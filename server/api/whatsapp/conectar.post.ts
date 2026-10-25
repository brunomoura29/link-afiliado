import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Inicia a conexão do WhatsApp do usuário: QR code (modo "qr") ou código de pareamento
// pelo número (modo "codigo"). Cria a instância na UazAPI se ainda não existir.
// Se já estiver conectada, não chama /instance/connect (isso reconectaria a sessão).
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const corpo = await readBody<{ modo?: string, telefone?: string }>(event)
  const modo = corpo?.modo === 'codigo' ? 'codigo' : 'qr'
  let telefone: string | undefined
  if (modo === 'codigo') {
    const d = String(corpo?.telefone ?? '').replace(/\D/g, '')
    telefone = d.length === 10 || d.length === 11 ? `55${d}` : d // aceita com ou sem o 55
    if (!/^\d{12,13}$/.test(telefone)) throw createError({ statusCode: 400, statusMessage: 'telefone_invalido' })
  }

  const falha = (e: unknown) => {
    if (e instanceof ErroUazapi) throw createError({ statusCode: e.status === 429 ? 429 : 502, statusMessage: 'uazapi', message: e.message })
    throw e
  }

  let token: string
  try {
    token = (await garantirInstancia(event, usuario.sub)).token
  } catch (e) {
    return falha(e)
  }

  try {
    const atual = await statusInstancia(token)
    if (atual.conectado) return { status: 'conectado' as const, qrcode: null, paircode: null }

    const r = await conectarInstancia(token, telefone)
    if (r.conectado) return { status: 'conectado' as const, qrcode: null, paircode: null }

    // O QR/código pode vir na resposta ou só no status logo depois
    let { qrcode, paircode } = r
    if (!qrcode && !paircode) ({ qrcode, paircode } = await statusInstancia(token))

    await serverSupabaseServiceRole(event).from('whatsapp_conexoes')
      .upsert({ owner_id: usuario.sub, status: 'aguardando' })

    return { status: 'aguardando' as const, qrcode: modo === 'qr' ? qrcode : null, paircode: modo === 'codigo' ? paircode : null }
  } catch (e) {
    return falha(e)
  }
})
