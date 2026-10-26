import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// "Enviar de novo agora" numa oferta já enviada: lê o produto de novo (preço, foto e
// legenda nova), põe uma nova rodada na fila e manda no 1º grupo na hora (os outros seguem
// o intervalo). Não conta no limite de repetições automáticas.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: oferta } = await admin.from('ofertas').select('id').eq('id', id).eq('owner_id', usuario.sub).maybeSingle()
  if (!oferta) throw createError({ statusCode: 404, statusMessage: 'nao_encontrada' })

  const r = await repetirOferta(admin, id, { manual: true })
  if (r.resultado !== 'na_fila') throw createError({ statusCode: 409, statusMessage: r.resultado, message: r.motivo })

  // A nova rodada passa na frente e o 1º grupo recebe agora
  await admin.from('envios').update({ agendado_para: new Date().toISOString() }).eq('oferta_id', id).eq('status', 'na_fila')
  const resultado = await processarDono(admin, usuario.sub, { ignorarIntervalo: true })
  const rodada = await rodadaAtual(admin, id)
  const { data: envios } = await admin.from('envios').select('status').eq('oferta_id', id).eq('rodada', rodada)
  return {
    resultado,
    enviados: envios?.filter(e => e.status === 'enviado').length ?? 0,
    naFila: envios?.filter(e => e.status === 'na_fila').length ?? 0
  }
})
