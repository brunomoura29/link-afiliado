import { serverSupabaseServiceRole } from '#supabase/server'

// Painel: botão "Outra" — escreve outra legenda com os mesmos dados lidos do produto.
export default defineEventHandler(async (event) => {
  const oferta = await exigirDonoDaOferta(event)
  if (!oferta.titulo || oferta.preco == null) {
    throw createError({ statusCode: 409, statusMessage: 'produto_nao_lido' })
  }

  const admin = serverSupabaseServiceRole(event)
  const { data: cfg } = await admin.from('configuracoes').select('tom, emojis, rodape').eq('owner_id', oferta.owner_id).maybeSingle()
  const { texto, ia } = await gerarLegenda(
    {
      titulo: oferta.titulo,
      preco: Number(oferta.preco),
      precoOriginal: oferta.preco_original == null ? null : Number(oferta.preco_original),
      condicaoPreco: oferta.condicao_preco,
      descontoRotulo: oferta.desconto_rotulo,
      link: oferta.link_afiliado
    },
    { tom: cfg?.tom ?? 'animado', emojis: cfg?.emojis ?? true, rodape: cfg?.rodape ?? '' }
  )
  await admin.from('ofertas').update({ legenda: texto }).eq('id', oferta.id)
  return { legenda: texto, ia }
})
