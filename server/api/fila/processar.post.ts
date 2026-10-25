import { serverSupabaseServiceRole } from '#supabase/server'

// Uma rodada da fila de envio (ver server/utils/filaEnvios.ts). Chamada a cada minuto pelo
// agendador (pg_cron + pg_net no Supabase) com o header "x-fila-segredo".
export default defineEventHandler(async (event) => {
  const { filaSegredo } = useRuntimeConfig()
  if (!filaSegredo) throw createError({ statusCode: 503, statusMessage: 'fila_nao_configurada' })
  if (getHeader(event, 'x-fila-segredo') !== filaSegredo) throw createError({ statusCode: 401, statusMessage: 'segredo_invalido' })

  return { resultados: await processarFila(serverSupabaseServiceRole(event)) }
})
