import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Rede de segurança: relê ofertas do usuário paradas em "pendente" (ex.: o servidor
// reiniciou no meio da leitura, ou ela chegou antes de a leitura existir).
// O painel chama ao abrir Ofertas e durante a atualização automática.
// TODO: trocar por um agendador (cron) quando o app estiver publicado.
const PARADA_HA_MS = 2 * 60_000 // criada há mais de 2 min e ainda pendente
const RELER_APOS_MS = 5 * 60_000 // não insiste na mesma oferta mais de 1x a cada 5 min
const MAXIMO_POR_VEZ = 5

export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const agora = Date.now()
  const { data } = await admin
    .from('ofertas')
    .select('id, lida_em')
    .eq('owner_id', usuario.sub)
    .eq('status', 'pendente')
    .lt('criado_em', new Date(agora - PARADA_HA_MS).toISOString())
    .order('criado_em')
    .limit(20)

  const paradas = (data ?? [])
    .filter(o => !o.lida_em || agora - new Date(o.lida_em).getTime() > RELER_APOS_MS)
    .slice(0, MAXIMO_POR_VEZ)

  for (const o of paradas) {
    // Marca a tentativa antes, para chamadas seguidas não lerem a mesma oferta em dobro
    await admin.from('ofertas').update({ lida_em: new Date().toISOString() }).eq('id', o.id)
    processarEmSegundoPlano(event, o.id)
  }
  return { relendo: paradas.length }
})
