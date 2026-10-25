import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Pipeline de uma oferta: lê o produto → escreve a legenda → aprova e coloca na fila
// dos grupos da categoria. Falha de leitura → "rejeitada" com o motivo (painel mostra
// "Tentar de novo"). Nunca deixa a oferta presa em "pendente" por erro inesperado.
export async function processarOferta(event: H3Event, ofertaId: string) {
  const admin = serverSupabaseServiceRole(event)
  const { data: oferta } = await admin.from('ofertas').select('*').eq('id', ofertaId).maybeSingle()
  if (!oferta) return

  try {
    const produto = await lerProduto(oferta.link_afiliado)

    const { data: cfg } = await admin.from('configuracoes').select('tom, emojis, rodape').eq('owner_id', oferta.owner_id).maybeSingle()
    const { texto: legenda } = await gerarLegenda(
      { titulo: produto.titulo, preco: produto.preco, precoOriginal: produto.precoOriginal, condicaoPreco: produto.condicaoPreco, descontoRotulo: produto.descontoRotulo, link: oferta.link_afiliado },
      { tom: cfg?.tom ?? 'animado', emojis: cfg?.emojis ?? true, rodape: cfg?.rodape ?? '' }
    )

    await admin.from('ofertas').update({
      titulo: produto.titulo,
      preco: produto.preco,
      preco_original: produto.precoOriginal,
      imagem_url: produto.imagem,
      item_id: produto.itemId,
      desconto_rotulo: produto.descontoRotulo,
      condicao_preco: produto.condicaoPreco,
      url_produto: produto.urlFinal,
      legenda,
      lida_em: new Date().toISOString(),
      status: 'aprovada',
      motivo: null
    }).eq('id', ofertaId)

    await colocarNaFila(event, oferta.owner_id, ofertaId, oferta.categoria_id)
  } catch (e) {
    const motivo = e instanceof FalhaLeitura ? e.message : 'Não conseguimos ler a página agora. Tente de novo mais tarde.'
    await admin.from('ofertas').update({ status: 'rejeitada', motivo, lida_em: new Date().toISOString() }).eq('id', ofertaId)
  }
}

// Um envio "na fila" por grupo da categoria que recebe ofertas (horário e intervalo ficam
// por conta da fila, server/utils/filaEnvios.ts). Grupo que já recebeu (ou está recebendo)
// esta oferta fica de fora; envios que falharam voltam para a fila.
export async function colocarNaFila(event: H3Event, ownerId: string, ofertaId: string, categoriaId: string | null) {
  if (!categoriaId) return
  const admin = serverSupabaseServiceRole(event)
  // A categoria da oferta + as categorias "geral" (recebem as ofertas de todas)
  const { data: gerais } = await admin.from('categorias').select('id').eq('owner_id', ownerId).eq('recebe_todas', true).eq('ativa', true)
  const categorias = [...new Set([categoriaId, ...(gerais ?? []).map(c => c.id)])]
  const { data: grupos } = await admin
    .from('whatsapp_destinos')
    .select('id, nome')
    .eq('owner_id', ownerId)
    .in('categoria_id', categorias)
    .eq('recebe_ofertas', true)
    .eq('pode_enviar', true)
  await admin.from('envios').delete().eq('oferta_id', ofertaId).in('status', ['na_fila', 'erro'])
  const { data: jaForam } = await admin.from('envios').select('destino_id').eq('oferta_id', ofertaId).in('status', ['enviado', 'enviando'])
  const pular = new Set((jaForam ?? []).map(e => e.destino_id))
  const novos = (grupos ?? []).filter(g => !pular.has(g.id))
  if (novos.length) {
    await admin.from('envios').insert(novos.map(g => ({ owner_id: ownerId, oferta_id: ofertaId, destino_id: g.id, grupo_nome: g.nome })))
  }
}

// Roda sem segurar a resposta HTTP
export function processarEmSegundoPlano(event: H3Event, ofertaId: string) {
  const tarefa = processarOferta(event, ofertaId).catch(() => {})
  event.waitUntil?.(tarefa)
}
