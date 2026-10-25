import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Cliente da UazAPI (só no servidor). Doc: fornecida pelo usuário sob demanda — não
// inventar rotas/campos. Implementado: POST /instance/create (header "admintoken").
// O token de cada instância fica em whatsapp_credenciais (RLS sem políticas) e nunca
// vai para o navegador.

export type StatusInstancia = 'disconnected' | 'connecting' | 'connected' | 'hibernated'

export class ErroUazapi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem)
  }
}

function configuracao() {
  const { uazapiUrl, uazapiAdminToken } = useRuntimeConfig()
  if (!uazapiUrl || !uazapiAdminToken) {
    throw new ErroUazapi(503, 'A integração com o WhatsApp ainda não foi configurada no servidor.')
  }
  return { url: String(uazapiUrl).replace(/\/$/, ''), adminToken: String(uazapiAdminToken) }
}

const MENSAGENS: Record<number, string> = {
  400: 'A UazAPI recusou os dados enviados.',
  401: 'O token da UazAPI é inválido ou expirou.',
  429: 'Limite de instâncias do WhatsApp atingido no plano da UazAPI.',
  503: 'A UazAPI está temporariamente indisponível. Tente de novo em instantes.'
}

async function chamar<T>(caminho: string, opcoes: { method: 'GET' | 'POST' | 'DELETE', body?: object, headers: Record<string, string> }) {
  const { url } = configuracao()
  try {
    return await $fetch<T>(`${url}${caminho}`, { ...opcoes, timeout: 20_000 })
  } catch (e) {
    const erro = e as { statusCode?: number, status?: number, data?: { max_instances?: number, current_instances?: number } }
    const status = erro.statusCode ?? erro.status ?? 500
    // 429 traz o limite do plano: {"max_instances":2,"current_instances":4,...}
    if (status === 429 && erro.data?.max_instances != null) {
      throw new ErroUazapi(429, `Limite de instâncias do WhatsApp atingido: o plano da UazAPI permite ${erro.data.max_instances} e já existem ${erro.data.current_instances ?? 'várias'}.`)
    }
    throw new ErroUazapi(status, MENSAGENS[status] ?? 'Não foi possível falar com a UazAPI agora.')
  }
}

interface RespostaCriar {
  token?: string
  name?: string
  instance?: { id?: string, token?: string, name?: string, status?: StatusInstancia }
  info?: string
}

// POST /instance/create — a instância nasce desconectada
export async function criarInstancia(nome: string, ownerId: string) {
  const { adminToken } = configuracao()
  const r = await chamar<RespostaCriar>('/instance/create', {
    method: 'POST',
    headers: { admintoken: adminToken },
    body: {
      name: nome,
      systemName: 'LinkAfiliado', // aparece em "Aparelhos conectados" no celular do cliente
      adminField01: ownerId // para achar o dono pelo painel da UazAPI
    }
  })
  const token = r.instance?.token ?? r.token
  if (!token) throw new ErroUazapi(500, 'A UazAPI não devolveu o token da instância.')
  return { token, id: r.instance?.id ?? null, nome: r.instance?.name ?? r.name ?? nome, aviso: r.info ?? null }
}

interface RespostaStatus {
  instance?: {
    status?: StatusInstancia
    profileName?: string
    profilePicUrl?: string
    qrcode?: string
    paircode?: string
    owner?: string
    lastDisconnect?: string
    lastDisconnectReason?: string
  }
  // A doc diz objeto ({ user: "5511…" }), mas na prática vem texto ("5511…:48@s.whatsapp.net")
  status?: { connected?: boolean, loggedIn?: boolean, jid?: string | { user?: string } | null }
}

// GET /instance/status (header "token" da instância)
export async function statusInstancia(token: string) {
  const r = await chamar<RespostaStatus>('/instance/status', { method: 'GET', headers: { token } })
  const jid = r.status?.jid
  const numero = (typeof jid === 'string' ? jid.split(/[:@]/)[0] : jid?.user) || r.instance?.owner || null
  return {
    status: r.instance?.status ?? (r.status?.connected ? 'connected' : 'disconnected') as StatusInstancia,
    conectado: !!(r.status?.connected && r.status?.loggedIn),
    numero: numero?.replace(/\D/g, '') || null,
    nomePerfil: r.instance?.profileName || null,
    foto: r.instance?.profilePicUrl || null,
    qrcode: r.instance?.qrcode || null,
    paircode: r.instance?.paircode || null,
    motivoDesconexao: r.instance?.lastDisconnectReason || null
  }
}

interface RespostaConectar {
  instance?: { status?: StatusInstancia, qrcode?: string, paircode?: string }
  status?: { connected?: boolean, loggedIn?: boolean }
  connected?: boolean
  loggedIn?: boolean
}

// POST /instance/connect — sem phone: QR code; com phone (5511999999999): código de pareamento.
// A instância fica "connecting" até parear ou expirar; acompanhar por GET /instance/status
// e NÃO repetir a chamada enquanto estiver em andamento (409).
export async function conectarInstancia(token: string, telefone?: string) {
  try {
    const r = await chamar<RespostaConectar>('/instance/connect', {
      method: 'POST',
      headers: { token },
      // history_days: 1 → pede o mínimo de histórico (o app não usa conversas antigas)
      body: { ...(telefone ? { phone: telefone } : {}), history_days: 1 }
    })
    return {
      emAndamento: false,
      conectado: !!(r.status?.connected ?? r.connected) && !!(r.status?.loggedIn ?? r.loggedIn),
      qrcode: r.instance?.qrcode || null,
      paircode: r.instance?.paircode || null
    }
  } catch (e) {
    // Já existe um fluxo em andamento: segue com ele (QR/código vêm pelo status)
    if (e instanceof ErroUazapi && e.status === 409) return { emAndamento: true, conectado: false, qrcode: null, paircode: null }
    if (e instanceof ErroUazapi && e.status === 429) throw new ErroUazapi(429, 'Muitas conexões ao mesmo tempo na UazAPI. Tente de novo em instantes.')
    throw e
  }
}

// Instância do cliente: devolve a existente ou cria na primeira vez
export async function garantirInstancia(event: H3Event, ownerId: string) {
  const admin = serverSupabaseServiceRole(event)
  const { data: existente } = await admin.from('whatsapp_credenciais').select('instancia, instancia_id, token').eq('owner_id', ownerId).maybeSingle()
  if (existente) {
    // Instância ligada à mão (ex.: testes) pode estar sem o registro de conexão
    await admin.from('whatsapp_conexoes').upsert({ owner_id: ownerId, status: 'desconectado' }, { onConflict: 'owner_id', ignoreDuplicates: true })
    return { ...existente, criada: false, aviso: null as string | null }
  }

  // Nome único e sem dados pessoais
  const nome = `la-${ownerId.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`
  const nova = await criarInstancia(nome, ownerId)

  const { error } = await admin.from('whatsapp_credenciais').insert({ owner_id: ownerId, instancia: nova.nome, instancia_id: nova.id, token: nova.token })
  // Corrida (duas abas ao mesmo tempo): fica a que gravou primeiro
  if (error) {
    const { data: vencedora } = await admin.from('whatsapp_credenciais').select('instancia, instancia_id, token').eq('owner_id', ownerId).single()
    return { ...vencedora!, criada: false, aviso: null }
  }
  await admin.from('whatsapp_conexoes').upsert({ owner_id: ownerId, status: 'desconectado' })
  return { instancia: nova.nome, instancia_id: nova.id, token: nova.token, criada: true, aviso: nova.aviso }
}
