import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '~/types/database.types'

// Repetição das ofertas já enviadas. Cada oferta guarda de quantos em quantos dias repete
// (herdado da categoria) e até quantas vezes. Quando a rodada termina (todos os grupos
// receberam), a próxima é marcada em proxima_repeticao_em; a tarefa ofertas:repetir
// (server/tasks) pega as vencidas, lê o produto de novo (preço, foto e legenda nova) e põe
// a nova rodada na fila, que segue o mesmo ritmo (intervalo, horário, limite diário).
// Pausa sozinha (repeticao_pausada = motivo) se o produto sumir/esgotar ou o preço subir.

type Admin = SupabaseClient<Database>
type Repeticao = Pick<Tables<'ofertas'>, 'repetir_a_cada_dias' | 'repetir_max' | 'repeticoes_feitas' | 'repeticao_pausada'>

const DIA = 24 * 60 * 60_000
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Quando a próxima rodada deve sair, contando a partir de "desde" (null = não repete mais)
export function proximaRepeticao(o: Repeticao, desde = new Date()) {
  if (!o.repetir_a_cada_dias || o.repeticao_pausada || o.repeticoes_feitas >= o.repetir_max) return null
  return new Date(Math.max(desde.getTime() + o.repetir_a_cada_dias * DIA, Date.now())).toISOString()
}

export type ResultadoRepeticao =
  | { resultado: 'na_fila', grupos: number }
  | { resultado: 'pausada' | 'falhou' | 'sem_grupos' | 'em_andamento' | 'nao_enviada', motivo: string }

// manual: "Enviar de novo agora" — não conta no limite de repetições, não pausa por falha
// de leitura e manda mesmo com o preço maior (a pessoa está vendo a oferta).
export async function repetirOferta(admin: Admin, ofertaId: string, opcoes: { manual?: boolean } = {}): Promise<ResultadoRepeticao> {
  const { data: oferta } = await admin.from('ofertas').select('*').eq('id', ofertaId).maybeSingle()
  if (!oferta) return { resultado: 'nao_enviada', motivo: 'Oferta não encontrada.' }
  if (oferta.status === 'aprovada') return { resultado: 'em_andamento', motivo: 'Esta oferta ainda está sendo enviada.' }
  if (oferta.status !== 'enviada') return { resultado: 'nao_enviada', motivo: 'Só dá para repetir uma oferta que já foi enviada.' }

  const pausar = async (motivo: string) => {
    await admin.from('ofertas').update({ repeticao_pausada: motivo, proxima_repeticao_em: null }).eq('id', ofertaId)
    return { resultado: 'pausada' as const, motivo }
  }

  let lido
  try {
    lido = await lerELegendar(admin, oferta)
  } catch (e) {
    const motivo = e instanceof FalhaLeitura ? e.message : 'Não deu para ler o produto agora.'
    return opcoes.manual ? { resultado: 'falhou', motivo } : pausar(`Não deu para ler o produto de novo (sumiu ou esgotou?): ${motivo}`)
  }
  const { produto, campos } = lido
  if (!opcoes.manual && oferta.preco_enviado != null && produto.preco != null && produto.preco > Number(oferta.preco_enviado)) {
    return pausar(`O preço subiu de ${reais(Number(oferta.preco_enviado))} para ${reais(produto.preco)}.`)
  }

  const rodada = (await rodadaAtual(admin, ofertaId)) + 1
  await admin.from('ofertas').update({
    ...campos,
    status: 'aprovada',
    motivo: null,
    proxima_repeticao_em: null,
    repeticoes_feitas: oferta.repeticoes_feitas + (opcoes.manual ? 0 : 1)
  }).eq('id', ofertaId)

  const grupos = await colocarNaFila(admin, oferta.owner_id, ofertaId, oferta.categoria_id, rodada) ?? 0
  if (!grupos) {
    // Nada para mandar: volta a "enviada" (os dados novos do produto ficam)
    await admin.from('ofertas').update({ status: 'enviada' }).eq('id', ofertaId)
    const motivo = 'A categoria não tem grupos recebendo ofertas.'
    return opcoes.manual ? { resultado: 'sem_grupos', motivo } : pausar(motivo)
  }
  return { resultado: 'na_fila', grupos }
}

// Tarefa de hora em hora: repete as ofertas vencidas (poucas por vez; cada leitura leva segundos)
export async function repetirVencidas(admin: Admin) {
  const { data } = await admin.from('ofertas').select('id')
    .eq('status', 'enviada')
    .is('repeticao_pausada', null)
    .lte('proxima_repeticao_em', new Date().toISOString())
    .order('proxima_repeticao_em')
    .limit(20)
  const resultados: Record<string, ResultadoRepeticao['resultado'] | 'erro'> = {}
  for (const { id } of data ?? []) {
    resultados[id] = await repetirOferta(admin, id).then(r => r.resultado, () => 'erro' as const)
  }
  return resultados
}
