import { serverSupabaseServiceRole } from '#supabase/server'

// Dados da página pública de entrada no grupo (/g/<slug>).
// Só o que é público: nada de número, convite direto ou dados de quem enviou.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const cat = await categoriaPorSlug(event, slug)
  const admin = serverSupabaseServiceRole(event)

  const seteDias = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [{ grupos, ativo }, perfil, recentes, semana] = await Promise.all([
    gruposDaCategoria(event, cat.owner_id, cat.id),
    admin.from('perfis').select('nome').eq('id', cat.owner_id).maybeSingle(),
    admin.from('ofertas')
      .select('id, titulo, plataforma, preco, preco_original, imagem_url, desconto_rotulo')
      .eq('categoria_id', cat.id)
      .in('status', ['aprovada', 'enviada'])
      .not('titulo', 'is', null)
      .order('criado_em', { ascending: false })
      .limit(6),
    admin.from('ofertas').select('id', { count: 'exact', head: true }).eq('categoria_id', cat.id).in('status', ['aprovada', 'enviada']).gte('criado_em', seteDias)
  ])

  return {
    slug,
    nome: cat.nome,
    emoji: cat.emoji,
    descricao: cat.descricao,
    dono: perfil.data?.nome || '',
    membros: grupos.reduce((s, g) => s + g.membros, 0),
    ofertasPorDia: Math.round((semana.count ?? 0) / 7),
    // 'aberto' = tem grupo com vaga; 'lotado' = tem grupos, todos cheios; 'em_breve' = nenhum grupo ainda
    situacao: ativo ? 'aberto' : grupos.length ? 'lotado' : 'em_breve',
    ofertas: (recentes.data ?? []).map(o => ({
      id: o.id,
      titulo: o.titulo!,
      plataforma: o.plataforma,
      preco: o.preco == null ? null : Number(o.preco),
      original: o.preco_original == null ? null : Number(o.preco_original),
      imagem: o.imagem_url,
      descontoRotulo: o.desconto_rotulo
    }))
  }
})
