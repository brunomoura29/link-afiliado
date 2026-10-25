import { serverSupabaseUser } from '#supabase/server'

// Garante que o usuário logado tem uma instância na UazAPI (cria na primeira vez).
// Nunca devolve o token da instância.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  try {
    const { instancia, criada, aviso } = await garantirInstancia(event, usuario.sub)
    return { instancia, criada, aviso }
  } catch (e) {
    if (e instanceof ErroUazapi) throw createError({ statusCode: e.status === 429 ? 429 : 502, statusMessage: 'uazapi', message: e.message })
    throw e
  }
})
