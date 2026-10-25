import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Exclui a conta do usuário logado. Perfil, configurações, categorias, links, ofertas,
// envios, cliques e leads são apagados em cascata (on delete cascade em auth.users);
// as fotos de grupo no Storage (fotos-grupos/<dono>/) são apagadas antes.
// TODO (UazAPI): desconectar e apagar a instância do WhatsApp antes.
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const admin = serverSupabaseServiceRole(event)
  const fotos = admin.storage.from('fotos-grupos')
  const { data: arquivos } = await fotos.list(usuario.sub, { limit: 1000 })
  if (arquivos?.length) await fotos.remove(arquivos.map(a => `${usuario.sub}/${a.name}`))

  const { error } = await admin.auth.admin.deleteUser(usuario.sub)
  if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_excluir' })
  return { ok: true }
})
