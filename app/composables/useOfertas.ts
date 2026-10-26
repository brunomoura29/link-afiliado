// Ofertas recebidas (formulário público ou painel) e o andamento de cada uma.
// Supabase: ofertas + envios. O status muda no servidor: leitura do produto (pendente →
// aprovada/rejeitada) e fila de envio (aprovada → enviada, server/utils/filaEnvios.ts).
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'
import type { Tables } from '~/types/database.types'

export interface Envio {
  grupo: string
  status: 'enviado' | 'na_fila' | 'enviando' | 'erro'
  quando: string | null
  erro: string | null // motivo, quando falhou ou não foi enviado
  rodada: number // 1 = 1º envio, 2 = 1ª repetição...
}

export interface RepeticaoOferta {
  aCadaDias: number | null // null = não repete
  max: number
  feitas: number // repetições já feitas (sem contar o 1º envio)
  proxima: string | null // quando sai a próxima rodada
  pausada: string | null // motivo da pausa (preço subiu, produto sumiu...)
}

export interface Oferta {
  id: string
  titulo: string | null // null = ainda lendo a página do produto
  plataforma: Plataforma
  preco: number | null
  original: number | null
  imagem: string | null
  condicao: string | null // ex.: "no Pix": o preço só vale nessa condição
  descontoRotulo: string | null // texto da loja, ex.: "42% OFF"
  categoriaId: string | null
  status: StatusPostagem
  motivo?: string
  legenda: string | null
  link: string
  origem: string // nome do link do formulário ou "Você"
  criadaEm: string
  matiz: number // cor da miniatura enquanto não há foto
  envios: Envio[]
  repeticao: RepeticaoOferta
}

type LinhaOferta = Tables<'ofertas'> & { envios: Pick<Tables<'envios'>, 'grupo_nome' | 'status' | 'enviado_em' | 'erro' | 'rodada'>[] }

// Cor estável a partir do id (a miniatura não muda a cada recarga)
const matizDo = (id: string) => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 360, 7)

const daLinha = (o: LinhaOferta): Oferta => ({
  id: o.id,
  titulo: o.titulo,
  plataforma: o.plataforma as Plataforma,
  preco: o.preco == null ? null : Number(o.preco),
  original: o.preco_original == null ? null : Number(o.preco_original),
  imagem: o.imagem_url,
  condicao: o.condicao_preco,
  descontoRotulo: o.desconto_rotulo,
  categoriaId: o.categoria_id,
  status: o.status as StatusPostagem,
  motivo: o.motivo ?? undefined,
  legenda: o.legenda,
  link: o.link_afiliado,
  origem: o.origem_nome,
  criadaEm: o.criado_em,
  matiz: matizDo(o.id),
  envios: (o.envios ?? []).map(e => ({ grupo: e.grupo_nome, status: e.status as Envio['status'], quando: e.enviado_em, erro: e.erro, rodada: e.rodada })),
  repeticao: {
    aCadaDias: o.repetir_a_cada_dias,
    max: o.repetir_max,
    feitas: o.repeticoes_feitas,
    proxima: o.proxima_repeticao_em,
    pausada: o.repeticao_pausada
  }
})

const COLUNAS = '*, envios(grupo_nome, status, enviado_em, erro, rodada)'

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
    $fetch(`/api/ofertas/${data.id}/processar`, { method: 'POST' }).catch(() => {})
    return 'ok'
  }

  // Lê o produto de novo (o servidor volta a oferta para "pendente" e processa)
  async function tentarNovamente(o: Oferta) {
    await $fetch(`/api/ofertas/${o.id}/processar`, { method: 'POST' })
    o.status = 'pendente'
    o.motivo = undefined
  }

  // Pede ao servidor para reler ofertas paradas em "pendente" (rede de segurança)
  async function relerParadas() {
    try {
      const { relendo } = await $fetch('/api/ofertas/pendentes', { method: 'POST' })
      return relendo
    } catch {
      return 0
    }
  }

  async function excluir(o: Oferta) {
    const { error } = await supabase.from('ofertas').delete().eq('id', o.id)
    if (error) throw error
    ofertas.value = ofertas.value.filter(x => x.id !== o.id)
  }

  // Outra legenda com IA (mesmos dados do produto). null = não deu (já avisou)
  async function novaLegenda(o: Oferta): Promise<string | null> {
    try {
      const { legenda, ia } = await $fetch(`/api/ofertas/${o.id}/legenda`, { method: 'POST' })
      if (!ia) toast.info('Usamos o modelo pronto', 'A IA não respondeu agora; tente "Outra" de novo.')
      return legenda
    } catch {
      toast.erro('Não foi possível gerar outra legenda', 'O produto precisa ter sido lido antes.')
      return null
    }
  }

  // Depende da UazAPI. false = não disponível ainda (já avisou)
  // Passa a oferta na frente da fila: o 1º grupo recebe na hora, os outros seguem o intervalo.
  // null = não enviou (já avisou com toast)
  async function enviarAgora(o: Oferta): Promise<{ enviados: number, naFila: number } | null> {
    try {
      const r = await $fetch(`/api/ofertas/${o.id}/enviar-agora`, { method: 'POST' })
      await carregar()
      if (r.resultado === 'erro') {
        toast.erro('Não foi possível enviar', r.erro ?? 'Tente de novo em instantes.')
        return null
      }
      return r
    } catch (e) {
      const msg = (e as { data?: { message?: string } }).data?.message
      toast.erro('Não foi possível enviar agora', msg ?? 'Verifique sua internet e tente de novo.')
      return null
    }
  }

  // Repetição automática desta oferta (salvar também tira a pausa). false = falhou (já avisou)
  async function configurarRepeticao(o: Oferta, cfg: { aCadaDias: number | null, max: number }) {
    try {
      const r = await $fetch(`/api/ofertas/${o.id}/repeticao`, { method: 'POST', body: cfg })
      o.repeticao = { aCadaDias: r.repetir_a_cada_dias, max: r.repetir_max, feitas: r.repeticoes_feitas, proxima: r.proxima_repeticao_em, pausada: r.repeticao_pausada }
      return true
    } catch (e) {
      const msg = (e as { data?: { message?: string } }).data?.message
      toast.erro('Não foi possível salvar a repetição', msg ?? 'Verifique sua internet e tente de novo.')
      return false
    }
  }

  // "Enviar de novo agora": nova rodada com o produto lido de novo; o 1º grupo recebe na hora.
  // null = não enviou (já avisou)
  async function enviarDeNovo(o: Oferta): Promise<{ enviados: number, naFila: number } | null> {
    try {
      const r = await $fetch(`/api/ofertas/${o.id}/repetir`, { method: 'POST' })
      await carregar()
      return r
    } catch (e) {
      const msg = (e as { data?: { message?: string } }).data?.message
      toast.erro('Não foi possível enviar de novo', msg ?? 'Verifique sua internet e tente de novo.')
      return null
    }
  }

  return { ofertas, carregar, adicionar, tentarNovamente, relerParadas, excluir, novaLegenda, enviarAgora, configurarRepeticao, enviarDeNovo }
}
