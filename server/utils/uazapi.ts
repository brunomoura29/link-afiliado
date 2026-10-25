import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Cliente da UazAPI (só no servidor). Doc: fornecida pelo usuário sob demanda — não
// inventar rotas/campos. Implementado: instância (create/status/connect) e grupos
// (list/invitelink/create/updateAnnounce/updateLocked/updateName/updateDescription/updateImage)
// e envio (send/media, send/text).
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
  403: 'O número conectado não é admin deste grupo.',
  404: 'O grupo não foi encontrado no WhatsApp.',
  429: 'Limite de instâncias do WhatsApp atingido no plano da UazAPI.',
  413: 'Texto ou imagem grande demais para o WhatsApp.',
  415: 'O WhatsApp só aceita foto em JPEG.',
  503: 'A UazAPI está temporariamente indisponível. Tente de novo em instantes.'
}

async function chamar<T>(caminho: string, opcoes: { method: 'GET' | 'POST' | 'DELETE', body?: object, headers: Record<string, string> }) {
  const { url } = configuracao()
  try {
    return await $fetch<T>(`${url}${caminho}`, { ...opcoes, timeout: 20_000 })
  } catch (e) {
    const erro = e as { statusCode?: number, status?: number, data?: { max_instances?: number, current_instances?: number, provider_message_ptbr?: string, message_ptbr?: string } }
    const status = erro.statusCode ?? erro.status ?? 500
    // 429 traz o limite do plano: {"max_instances":2,"current_instances":4,...}
    if (status === 429 && erro.data?.max_instances != null) {
      throw new ErroUazapi(429, `Limite de instâncias do WhatsApp atingido: o plano da UazAPI permite ${erro.data.max_instances} e já existem ${erro.data.current_instances ?? 'várias'}.`)
    }
    // Erro vindo do próprio WhatsApp (ex.: 463, conta com restrição temporária) já vem explicado
    const doWhatsapp = erro.data?.provider_message_ptbr || erro.data?.message_ptbr
    throw new ErroUazapi(status, doWhatsapp || MENSAGENS[status] || 'Não foi possível falar com a UazAPI agora.')
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

// Só aceita convite do WhatsApp (o /g/<slug>/entrar redireciona para ele)
const CONVITE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/

interface GrupoUazapi {
  JID?: string
  Name?: string
  ParticipantCount?: number
  OwnerIsAdmin?: boolean // pode vir ausente quando falso
  OwnerCanSendMessage?: boolean
  IsAnnounce?: boolean // só admins mandam mensagem
  IsParent?: boolean // comunidade (não é grupo de conversa)
  Topic?: string // descrição
  invite_link?: string // só para admin confirmado
  image_preview_url?: string
  image_url?: string
}

// GET /group/list (legado, sem paginação). noParticipants=true: só o resumo de cada grupo.
// force=true pede atualização (a UazAPI pode reaproveitar uma de até 20 s atrás).
export async function listarGrupos(token: string) {
  const r = await chamar<{ groups?: GrupoUazapi[] }>('/group/list?noParticipants=true&force=true', {
    method: 'GET',
    headers: { token }
  })
  return (r.groups ?? [])
    .filter(g => g.JID && !g.IsParent)
    .map(g => ({
      jid: g.JID!,
      nome: g.Name?.trim() || 'Grupo sem nome',
      membros: g.ParticipantCount ?? 0,
      admin: g.OwnerIsAdmin === true,
      podeEnviar: g.OwnerCanSendMessage !== false,
      soAdmins: g.IsAnnounce === true,
      descricao: g.Topic?.trim() ?? '',
      convite: g.invite_link && CONVITE.test(g.invite_link) ? g.invite_link : null,
      foto: g.image_preview_url || g.image_url || null
    }))
}

// GET /group/invitelink/{jid} — devolve o convite atual (não revoga: chamadas repetidas
// trazem o mesmo link). Exige o número como admin. ~2–4 s por grupo.
export async function obterConvite(token: string, jid: string) {
  const r = await chamar<{ inviteLink?: string }>(`/group/invitelink/${encodeURIComponent(jid)}`, { method: 'GET', headers: { token } })
  return r.inviteLink && CONVITE.test(r.inviteLink) ? r.inviteLink : null
}

// POST /group/create — sempre sem participantes: o WhatsApp inclui só o criador (admin) e
// as pessoas entram pelo convite (adicionar sem pedido é o que mais bane número).
export async function criarGrupoWhatsapp(token: string, nome: string) {
  const r = await chamar<{ group?: GrupoUazapi }>('/group/create', {
    method: 'POST',
    headers: { token },
    body: { name: nome, participants: [] }
  })
  if (!r.group?.JID) throw new ErroUazapi(500, 'A UazAPI não devolveu o grupo criado.')
  return {
    jid: r.group.JID,
    nome: r.group.Name?.trim() || nome,
    membros: r.group.ParticipantCount || 1,
    convite: r.group.invite_link && CONVITE.test(r.group.invite_link) ? r.group.invite_link : null
  }
}

// POST /group/updateAnnounce — true: só admins mandam mensagem. Exige o número como admin (403).
export async function definirSoAdmins(token: string, jid: string, soAdmins: boolean) {
  const r = await chamar<{ group?: GrupoUazapi }>('/group/updateAnnounce', {
    method: 'POST',
    headers: { token },
    body: { groupjid: jid, announce: soAdmins }
  })
  return r.group?.IsAnnounce ?? soAdmins
}

// POST /group/updateLocked — true: só admins mudam nome, descrição e foto. Exige admin (403).
export async function definirEdicaoSoAdmins(token: string, jid: string, travado: boolean) {
  const r = await chamar<{ group?: GrupoUazapi & { IsLocked?: boolean } }>('/group/updateLocked', {
    method: 'POST',
    headers: { token },
    body: { groupjid: jid, locked: travado }
  })
  return r.group?.IsLocked ?? travado
}

// POST /group/updateName — 1 a 25 letras (limite da doc; criar aceita até 100). Exige admin.
export async function renomearGrupo(token: string, jid: string, nome: string) {
  await chamar('/group/updateName', { method: 'POST', headers: { token }, body: { groupjid: jid, name: nome } })
}

// POST /group/updateDescription — até 512 letras. Exige admin.
export async function definirDescricao(token: string, jid: string, descricao: string) {
  await chamar('/group/updateDescription', { method: 'POST', headers: { token }, body: { groupjid: jid, description: descricao } })
}

// POST /group/updateImage — JPEG até 640x640 (URL ou data URL base64) ou "remove". Exige admin.
export async function definirImagem(token: string, jid: string, imagem: string) {
  const r = await chamar<{ group?: GrupoUazapi }>('/group/updateImage', { method: 'POST', headers: { token }, body: { groupjid: jid, image: imagem } })
  return r.group?.image_preview_url || r.group?.image_url || null
}

interface RespostaEnvio { messageid?: string, id?: string }

// POST /send/media — foto do produto com a legenda. number = JID do grupo (…@g.us).
export async function enviarImagem(token: string, jid: string, imagemUrl: string, legenda: string) {
  const r = await chamar<RespostaEnvio>('/send/media', {
    method: 'POST',
    headers: { token },
    body: { number: jid, type: 'image', file: imagemUrl, text: legenda }
  })
  return r.messageid || r.id || null
}

// POST /send/text — só a legenda, com prévia do link (oferta sem foto ou foto recusada)
export async function enviarTexto(token: string, jid: string, texto: string) {
  const r = await chamar<RespostaEnvio>('/send/text', {
    method: 'POST',
    headers: { token },
    body: { number: jid, text: texto, linkPreview: true }
  })
  return r.messageid || r.id || null
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
