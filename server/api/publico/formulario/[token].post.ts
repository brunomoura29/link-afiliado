import { serverSupabaseServiceRole } from '#supabase/server'

// Assistente envia uma oferta pelo formulário público (sem login).
// Tudo é validado de novo aqui: token ativo, categoria do mesmo dono e ativa, link válido.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') ?? ''
  const link = await linkPorToken(event, token)

  if (!dentroDoLimite(token)) {
    throw createError({ statusCode: 429, statusMessage: 'muitos_envios' })
  }

  const corpo = await readBody<{ categoriaId?: string, link?: string }>(event)
  const linkAfiliado = normalizarLink(String(corpo?.link ?? '')).slice(0, 2000)
  const plataforma = detectarPlataforma(linkAfiliado)
  if (!plataforma) throw createError({ statusCode: 400, statusMessage: 'link_invalido_oferta' })

  const admin = serverSupabaseServiceRole(event)
  const { data: categoria } = await admin
    .from('categorias')
    .select('id')
    .eq('id', String(corpo?.categoriaId ?? ''))
    .eq('owner_id', link.owner_id)
    .eq('ativa', true)
    .maybeSingle()
  if (!categoria) throw createError({ statusCode: 400, statusMessage: 'categoria_invalida' })

  const { data: oferta, error } = await admin
    .from('ofertas')
    .insert({
      owner_id: link.owner_id,
      categoria_id: categoria.id,
      link_formulario_id: link.id,
      origem_nome: link.nome,
      link_afiliado: linkAfiliado,
      plataforma,
      status: 'pendente'
    })
    .select('id, status')
    .single()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'duplicada' })
  if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar' })

  await admin.from('links_formulario').update({ ultimo_uso: new Date().toISOString() }).eq('id', link.id)

  processarEmSegundoPlano(event, oferta.id)
  return oferta
})
