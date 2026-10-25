import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// "Enviar agora, sem esperar a fila": a oferta passa na frente e o 1º grupo recebe na hora.
// Os outros grupos seguem o intervalo normal (mandar em todos de uma vez é o que mais
// derruba número). Horário e limite diário continuam valendo.
// Produto lido há mais de 24 h: lê de novo (preço/legenda atuais) antes de mandar.
// Oferta sem envios (aprovada antes de a categoria ter grupos): monta a fila agora.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const ler = () => admin.from('ofertas').select('id, status, motivo, lida_em, categoria_id').eq('id', id).eq('owner_id', usuario.sub).maybeSingle()
  let { data: oferta } = await ler()
  if (!oferta) throw createError({ statusCode: 404, statusMessage: 'nao_encontrada' })
  if (oferta.status !== 'aprovada') throw createError({ statusCode: 409, statusMessage: 'nao_aprovada', message: 'Só dá para enviar uma oferta aprovada.' })

  if (!oferta.lida_em || Date.now() - new Date(oferta.lida_em).getTime() > VALIDADE_OFERTA) {
    await processarOferta(event, id) // lê de novo, escreve a legenda e monta a fila
    oferta = (await ler()).data
    if (oferta?.status !== 'aprovada') {
      throw createError({ statusCode: 409, statusMessage: 'releitura_falhou', message: oferta?.motivo ?? 'Não deu para ler o produto de novo. Tente mais tarde.' })
    }
  } else {
    const { count } = await admin.from('envios').select('id', { count: 'exact', head: true }).eq('oferta_id', id).eq('status', 'na_fila')
    if (!count) await colocarNaFila(event, usuario.sub, id, oferta.categoria_id)
  }

  const { data: naFila } = await admin.from('envios').update({ agendado_para: new Date().toISOString() })
    .eq('oferta_id', id).eq('status', 'na_fila').select('id')
  if (!naFila?.length) throw createError({ statusCode: 409, statusMessage: 'sem_grupos', message: 'Nenhum grupo para receber esta oferta: a categoria dela não tem grupos recebendo ofertas (ou todos já receberam).' })

  const resultado = await processarDono(admin, usuario.sub, { ignorarIntervalo: true })
  const MENSAGENS: Partial<Record<ResultadoDono, string>> = {
    fora_do_horario: 'Fora do horário de envio (pausa noturna). A oferta vai na frente assim que o horário abrir.',
    desconectado: 'O WhatsApp está desconectado. A oferta vai na frente assim que você conectar.',
    sem_whatsapp: 'Conecte o WhatsApp para enviar.'
  }
  if (MENSAGENS[resultado]) throw createError({ statusCode: 409, statusMessage: resultado, message: MENSAGENS[resultado] })

  const { data: envios } = await admin.from('envios').select('status, erro').eq('oferta_id', id)
  return {
    resultado,
    enviados: envios?.filter(e => e.status === 'enviado').length ?? 0,
    naFila: envios?.filter(e => e.status === 'na_fila').length ?? 0,
    erro: resultado === 'erro' ? envios?.find(e => e.erro)?.erro ?? null : null
  }
})
