import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Configura a repetição automática de uma oferta (de quantos em quantos dias e até
// quantas vezes) e tira a pausa. Recalcula a próxima rodada a partir do último envio.
const PERIODOS = [2, 3, 7, 15, 30]

export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const corpo = await readBody<{ aCadaDias?: number | null, max?: number }>(event)
  const aCadaDias = corpo?.aCadaDias ?? null
  const max = corpo?.max ?? 3
  if (aCadaDias !== null && !PERIODOS.includes(aCadaDias)) throw createError({ statusCode: 400, statusMessage: 'periodo_invalido' })
  if (!Number.isInteger(max) || max < 1 || max > 10) throw createError({ statusCode: 400, statusMessage: 'max_invalido', message: 'Escolha de 1 a 10 repetições.' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: oferta } = await admin.from('ofertas').select('status, repeticoes_feitas').eq('id', id).eq('owner_id', usuario.sub).maybeSingle()
  if (!oferta) throw createError({ statusCode: 404, statusMessage: 'nao_encontrada' })

  const config = { repetir_a_cada_dias: aCadaDias, repetir_max: max, repeticoes_feitas: oferta.repeticoes_feitas, repeticao_pausada: null }
  // Já enviada: a próxima rodada conta do último envio (se já passou, sai na próxima hora)
  let proxima: string | null = null
  if (oferta.status === 'enviada') {
    const { data: ultimo } = await admin.from('envios').select('enviado_em').eq('oferta_id', id).eq('status', 'enviado')
      .order('enviado_em', { ascending: false }).limit(1).maybeSingle()
    proxima = proximaRepeticao(config, ultimo?.enviado_em ? new Date(ultimo.enviado_em) : new Date())
  }

  const { data: linha, error } = await admin.from('ofertas')
    .update({ repetir_a_cada_dias: aCadaDias, repetir_max: max, repeticao_pausada: null, proxima_repeticao_em: proxima })
    .eq('id', id).select('repetir_a_cada_dias, repetir_max, repeticoes_feitas, proxima_repeticao_em, repeticao_pausada').single()
  if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar' })
  return linha
})
