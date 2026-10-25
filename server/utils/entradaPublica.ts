import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Acima disso o grupo para de receber novos membros e o próximo da fila assume
// (mesma regra do painel: app/composables/useGrupos.ts)
const LIMITE_ENTRADA = 0.9

// Categoria pública pelo endereço /g/<slug>. Pausada ou inexistente → 404.
export async function categoriaPorSlug(event: H3Event, slug: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw createError({ statusCode: 404, statusMessage: 'nao_encontrada' })
  const { data } = await serverSupabaseServiceRole(event)
    .from('categorias')
    .select('id, owner_id, nome, emoji, descricao, ativa')
    .eq('slug', slug)
    .maybeSingle()
  if (!data?.ativa) throw createError({ statusCode: 404, statusMessage: 'nao_encontrada' })
  return data
}

// Grupos da categoria na ordem de rotação + o que está recebendo membros agora
export async function gruposDaCategoria(event: H3Event, ownerId: string, categoriaId: string) {
  const { data } = await serverSupabaseServiceRole(event)
    .from('whatsapp_destinos')
    .select('id, membros, capacidade, admin, convite_url')
    .eq('owner_id', ownerId)
    .eq('categoria_id', categoriaId)
    .eq('tipo', 'grupo')
    .order('ordem')
  const grupos = data ?? []
  const ativo = grupos.find(g => g.admin && g.convite_url && g.membros < g.capacidade * LIMITE_ENTRADA) ?? null
  return { grupos, ativo }
}
