import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// Fila de envio das ofertas para os grupos (whatsapp_destinos), chamada a cada minuto
// (POST /api/fila/processar).
// Regras para não queimar o número:
// - no máximo 1 envio por número a cada rodada, e o próximo só depois de um intervalo
//   aleatório entre intervalo_min e intervalo_max (configuracoes), em whatsapp_conexoes.proximo_envio_em;
// - só dentro do horário (pausa noturna: inicio–fim, horário de Brasília);
// - limite diário por grupo (limite_diario);
// - oferta com o produto lido há mais de 24 h não vai (preço/estoque podem ter mudado).
// Um envio é "pego" (na_fila → enviando) antes de mandar, então duas rodadas ao mesmo tempo
// não mandam a mesma mensagem duas vezes.

type Admin = SupabaseClient<Database>

const FUSO = 'America/Sao_Paulo'
export const VALIDADE_OFERTA = 24 * 60 * 60_000
const PRESO = 10 * 60_000 // "enviando" há mais que isso: a rodada caiu no meio

export type ResultadoDono =
  | 'enviado' | 'nada_na_fila' | 'fora_do_horario' | 'aguardando_intervalo'
  | 'sem_whatsapp' | 'desconectado' | 'erro'

const horaEmBrasilia = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)

// Começo do dia em Brasília (sem horário de verão desde 2019: UTC-3)
function inicioDoDia(d: Date) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d) // 2026-10-26
  return new Date(`${dia}T00:00:00-03:00`)
}

function dentroDoHorario(agora: Date, inicio: string, fim: string) {
  const h = horaEmBrasilia(agora)
  const [i, f] = [inicio.slice(0, 5), fim.slice(0, 5)]
  return i <= f ? h >= i && h < f : h >= i || h < f // fim antes do início: atravessa a meia-noite
}

const minutosAleatorios = (min: number, max: number) => (min + Math.random() * (max - min)) * 60_000

// Uma rodada: um envio (no máximo) por dono com envio vencido
export async function processarFila(admin: Admin) {
  const agora = new Date()

  // Rodada que caiu no meio do envio: não dá para saber se a mensagem saiu, então não repete
  await admin.from('envios')
    .update({ status: 'erro', erro: 'O envio foi interrompido. Confira no grupo se a oferta chegou.' })
    .eq('status', 'enviando')
    .lt('pego_em', new Date(agora.getTime() - PRESO).toISOString())

  const { data: vencidos } = await admin.from('envios')
    .select('owner_id')
    .eq('status', 'na_fila')
    .or(`agendado_para.is.null,agendado_para.lte.${agora.toISOString()}`)
    .limit(1000)
  const donos = [...new Set((vencidos ?? []).map(e => e.owner_id))]

  const resultados: Record<string, ResultadoDono> = {}
  for (const dono of donos) resultados[dono] = await processarDono(admin, dono).catch(() => 'erro' as const)
  return resultados
}

// Manda o próximo envio de um dono, se puder. ignorarIntervalo: "Enviar agora" (só o 1º)
export async function processarDono(admin: Admin, ownerId: string, opcoes: { ignorarIntervalo?: boolean } = {}): Promise<ResultadoDono> {
  const agora = new Date()
  const { data: cfg } = await admin.from('configuracoes')
    .select('limite_diario, intervalo_min, intervalo_max, pausa_noturna, inicio, fim')
    .eq('owner_id', ownerId).maybeSingle()
  if (!cfg) return 'erro'
  if (cfg.pausa_noturna && !dentroDoHorario(agora, cfg.inicio, cfg.fim)) return 'fora_do_horario'

  const { data: conexao } = await admin.from('whatsapp_conexoes').select('proximo_envio_em').eq('owner_id', ownerId).maybeSingle()
  if (!opcoes.ignorarIntervalo && conexao?.proximo_envio_em && new Date(conexao.proximo_envio_em) > agora) return 'aguardando_intervalo'

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', ownerId).maybeSingle()
  if (!cred) return 'sem_whatsapp'

  // Primeiro os de "Enviar agora" (agendado_para preenchido), depois ofertas novas antes de
  // repetições (rodada 1 primeiro: repetição só ocupa a vaga do limite diário que sobrar)
  const { data: candidatos } = await admin.from('envios')
    .select('id, oferta_id, destino_id, criado_em, tentativas, rodada, whatsapp_destinos(jid, nome, recebe_ofertas, pode_enviar, categorias(ativa)), ofertas(legenda, imagem_url, status, lida_em)')
    .eq('owner_id', ownerId)
    .eq('status', 'na_fila')
    .or(`agendado_para.is.null,agendado_para.lte.${agora.toISOString()}`)
    .order('agendado_para', { ascending: true, nullsFirst: false })
    .order('rodada', { ascending: true })
    .order('criado_em', { ascending: true })
    .limit(20)
  if (!candidatos?.length) return 'nada_na_fila'

  const marcarErro = (id: string, erro: string) => admin.from('envios').update({ status: 'erro', erro }).eq('id', id).eq('status', 'na_fila')
  const enviadosHoje = new Map<string, number>()
  const desdeHoje = inicioDoDia(agora).toISOString()

  let escolhido: (typeof candidatos)[number] | null = null
  for (const c of candidatos) {
    const grupo = c.whatsapp_destinos
    const oferta = c.ofertas
    if (!oferta || oferta.status !== 'aprovada' || !oferta.legenda) {
      await marcarErro(c.id, 'A oferta não está mais aprovada.')
      continue
    }
    if (!grupo) {
      await marcarErro(c.id, 'O grupo saiu da lista do WhatsApp.')
      continue
    }
    if (!grupo.recebe_ofertas || !grupo.pode_enviar || grupo.categorias?.ativa === false) {
      await marcarErro(c.id, !grupo.pode_enviar ? 'O número não consegue mandar mensagem neste grupo.' : 'O grupo ou a categoria está pausado.')
      continue
    }
    if (agora.getTime() - new Date(oferta.lida_em ?? c.criado_em).getTime() > VALIDADE_OFERTA) {
      await marcarErro(c.id, 'O produto foi lido há mais de 24 h: não foi enviada para não divulgar preço velho. Use "Enviar agora" para ler de novo e enviar.')
      continue
    }
    if (!enviadosHoje.has(c.destino_id!)) {
      const { count } = await admin.from('envios').select('id', { count: 'exact', head: true })
        .eq('destino_id', c.destino_id!).eq('status', 'enviado').gte('enviado_em', desdeHoje)
      enviadosHoje.set(c.destino_id!, count ?? 0)
    }
    if (enviadosHoje.get(c.destino_id!)! >= cfg.limite_diario) {
      await marcarErro(c.id, `O grupo já recebeu ${cfg.limite_diario} ofertas hoje (limite diário).`)
      continue
    }
    escolhido = c
    break
  }
  if (!escolhido) return 'nada_na_fila'

  // Desconectado: a fila espera (não marca erro)
  const status = await statusInstancia(cred.token).catch(() => null)
  if (!status?.conectado) return 'desconectado'

  // Sem o registro de conexão (instância ligada à mão) a reserva abaixo nunca acharia linha
  if (!conexao) await admin.from('whatsapp_conexoes').upsert({ owner_id: ownerId, status: 'conectado' }, { onConflict: 'owner_id', ignoreDuplicates: true })

  // Reserva a vez do número (o próximo só depois do intervalo) e pega o envio
  const proximo = new Date(agora.getTime() + minutosAleatorios(cfg.intervalo_min, cfg.intervalo_max)).toISOString()
  let reserva = admin.from('whatsapp_conexoes').update({ proximo_envio_em: proximo }).eq('owner_id', ownerId)
  if (!opcoes.ignorarIntervalo) reserva = reserva.or(`proximo_envio_em.is.null,proximo_envio_em.lte.${agora.toISOString()}`)
  const { data: reservou } = await reserva.select('owner_id')
  if (!reservou?.length) return 'aguardando_intervalo'

  const { data: pegou } = await admin.from('envios').update({ status: 'enviando', pego_em: agora.toISOString() }).eq('id', escolhido.id).eq('status', 'na_fila').select('id')
  if (!pegou?.length) return 'nada_na_fila'

  const grupo = escolhido.whatsapp_destinos!
  const oferta = escolhido.ofertas!
  try {
    let mensagemId: string | null
    try {
      mensagemId = oferta.imagem_url
        ? await enviarImagem(cred.token, grupo.jid, oferta.imagem_url, oferta.legenda!)
        : await enviarTexto(cred.token, grupo.jid, oferta.legenda!)
    } catch (e) {
      // Foto recusada (formato/tamanho): manda só o texto, com a prévia do link
      if (!(oferta.imagem_url && e instanceof ErroUazapi && [400, 413, 415].includes(e.status))) throw e
      mensagemId = await enviarTexto(cred.token, grupo.jid, oferta.legenda!)
    }
    await admin.from('envios').update({ status: 'enviado', enviado_em: new Date().toISOString(), mensagem_id: mensagemId, erro: null }).eq('id', escolhido.id)
  } catch (e) {
    // 429 = a UazAPI recusou antes de mandar: volta para a fila. Outros erros não repetem
    // (sem resposta não dá para saber se a mensagem saiu, e repetir duplicaria no grupo)
    const mensagem = e instanceof ErroUazapi ? e.message : 'Não foi possível enviar agora.'
    if (e instanceof ErroUazapi && e.status === 429 && escolhido.tentativas < 3) {
      await admin.from('envios').update({ status: 'na_fila', tentativas: escolhido.tentativas + 1, agendado_para: new Date(Date.now() + 5 * 60_000).toISOString() }).eq('id', escolhido.id)
    } else {
      await admin.from('envios').update({ status: 'erro', erro: mensagem, tentativas: escolhido.tentativas + 1 }).eq('id', escolhido.id)
    }
    await concluirOferta(admin, escolhido.oferta_id)
    return 'erro'
  }

  await concluirOferta(admin, escolhido.oferta_id)
  return 'enviado'
}

// Oferta vira "enviada" quando nada dela está mais na fila e pelo menos um grupo recebeu;
// aí, se ela repete, marca a próxima rodada (e guarda o preço, para ver se subiu)
async function concluirOferta(admin: Admin, ofertaId: string) {
  const rodada = await rodadaAtual(admin, ofertaId)
  const { data: envios } = await admin.from('envios').select('status').eq('oferta_id', ofertaId).eq('rodada', rodada)
  if (!envios?.length || envios.some(e => e.status === 'na_fila' || e.status === 'enviando')) return
  if (!envios.some(e => e.status === 'enviado')) {
    // 1ª rodada sem nenhum envio: fica "aprovada" (dá para tentar pelo "Enviar agora").
    // Repetição sem nenhum envio: volta a "enviada" e pausa, para não ficar presa.
    if (rodada > 1) {
      await admin.from('ofertas').update({ status: 'enviada', repeticao_pausada: 'Nenhum grupo recebeu a última repetição. Veja o motivo em cada grupo.', proxima_repeticao_em: null })
        .eq('id', ofertaId).eq('status', 'aprovada')
    }
    return
  }
  const { data: o } = await admin.from('ofertas').update({ status: 'enviada' }).eq('id', ofertaId).eq('status', 'aprovada')
    .select('preco, repetir_a_cada_dias, repetir_max, repeticoes_feitas, repeticao_pausada').maybeSingle()
  if (o) await admin.from('ofertas').update({ preco_enviado: o.preco, proxima_repeticao_em: proximaRepeticao(o) }).eq('id', ofertaId)
}
