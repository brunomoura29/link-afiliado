// Ofertas recebidas (formulário público ou painel) e o andamento de cada uma.
// Supabase: ofertas + envios. O status muda no servidor: leitura do produto (pendente →
// aprovada/rejeitada) e fila de envio (aprovada → enviada) — próximas fases.
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'
import type { Tables } from '~/types/database.types'

export interface Envio {
  grupo: string
  status: 'enviado' | 'na_fila' | 'erro'
  quando: string | null
}

export interface Oferta {
  id: string
  titulo: string | null // null = ainda lendo a página do produto
  plataforma: Plataforma
  preco: number | null
  original: number | null
  imagem: string | null
  categoriaId: string | null
  status: StatusPostagem
  motivo?: string
  legenda: string | null
  link: string
  origem: string // nome do link do formulário ou "Você"
  criadaEm: string
  matiz: number // cor da miniatura enquanto não há foto
  envios: Envio[]
}

type LinhaOferta = Tables<'ofertas'> & { envios: Pick<Tables<'envios'>, 'grupo_nome' | 'status' | 'enviado_em'>[] }

// Cor estável a partir do id (a miniatura não muda a cada recarga)
const matizDo = (id: string) => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 360, 7)

const daLinha = (o: LinhaOferta): Oferta => ({
  id: o.id,
  titulo: o.titulo,
  plataforma: o.plataforma as Plataforma,
  preco: o.preco == null ? null : Number(o.preco),
  original: o.preco_original == null ? null : Number(o.preco_original),
  imagem: o.imagem_url,
  categoriaId: o.categoria_id,
  status: o.status as StatusPostagem,
  motivo: o.motivo ?? undefined,
  legenda: o.legenda,
  link: o.link_afiliado,
  origem: o.origem_nome,
  criadaEm: o.criado_em,
  matiz: matizDo(o.id),
  envios: (o.envios ?? []).map(e => ({ grupo: e.grupo_nome, status: e.status as Envio['status'], quando: e.enviado_em }))
})

const COLUNAS = '*, envios(grupo_nome, status, enviado_em)'

export function useOfertas() {
  const supabase = useSupabaseClient()
  const toast = useToast()
  const ofertas = useState<Oferta[]>('ofertas', () => [])

  async function carregar() {
    // TODO: paginar quando passar de algumas centenas
    const { data, error } = await supabase.from('ofertas').select(COLUNAS).order('criado_em', { ascending: false }).limit(300)
    if (error) throw error
    ofertas.value = (data as LinhaOferta[]).map(daLinha)
    return true
  }

  // Cadastro pelo painel. 'duplicada' = esse link já existe na conta
  async function adicionar(categoriaId: string, link: string, plataforma: Plataforma): Promise<'ok' | 'duplicada' | 'erro'> {
    const { data, error } = await supabase
      .from('ofertas')
      .insert({ categoria_id: categoriaId, link_afiliado: link, plataforma, origem_nome: 'Você' })
      .select(COLUNAS)
      .single()
    if (error) return error.code === '23505' ? 'duplicada' : 'erro'
    ofertas.value.unshift(daLinha(data as LinhaOferta))
    // TODO: disparar a leitura do produto
    return 'ok'
  }

  // Volta para a fila de leitura do produto
  async function tentarNovamente(o: Oferta) {
    const { error } = await supabase.from('ofertas').update({ status: 'pendente', motivo: null }).eq('id', o.id)
    if (error) throw error
    o.status = 'pendente'
    o.motivo = undefined
  }

  async function excluir(o: Oferta) {
    const { error } = await supabase.from('ofertas').delete().eq('id', o.id)
    if (error) throw error
    ofertas.value = ofertas.value.filter(x => x.id !== o.id)
  }

  // Dependem de fases seguintes (IA e UazAPI). null/false = não disponível ainda (já avisou)
  async function novaLegenda(_o: Oferta): Promise<string | null> {
    toast.info('Disponível em breve', 'A legenda com IA entra na próxima fase.')
    return null
  }
  async function enviarAgora(_o: Oferta): Promise<boolean> {
    toast.info('Disponível em breve', 'O envio funciona quando o WhatsApp for ligado pela UazAPI.')
    return false
  }

  return { ofertas, carregar, adicionar, tentarNovamente, excluir, novaLegenda, enviarAgora }
}
