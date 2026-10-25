// Captação de membros: cliques nos links de entrada (/g/...) e pessoas que pediram
// o convite pela palavra-chave. Supabase: cliques_entrada + leads (últimos 30 dias).
// TODO (UazAPI): leads vêm do webhook de mensagem recebida (palavra-chave) e
// "novos membros" do webhook de participante que entrou no grupo.

export type Periodo = 'hoje' | '7d' | '30d'

export interface Lead {
  id: string
  nome: string
  numero: string
  palavraChave: string
  categoriaId: string | null
  criadoEm: string
  entrou: boolean // entrou no grupo depois de receber o convite
}

interface Clique { origem: string, categoriaId: string | null, criadoEm: string }

export const ORIGENS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  bio: 'Link na bio',
  whatsapp: 'Status do WhatsApp',
  facebook: 'Facebook',
  youtube: 'YouTube',
  kwai: 'Kwai',
  twitter: 'X / Twitter',
  telegram: 'Telegram',
  outra: 'Outra origem',
  direto: 'Direto / sem origem'
}

function desde(p: Periodo) {
  if (p === 'hoje') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  return Date.now() - (p === '7d' ? 7 : 30) * 86_400_000
}

export function useLeads() {
  const supabase = useSupabaseClient()
  const cliques = useState<Clique[]>('cliques-entrada', () => [])
  const leads = useState<Lead[]>('leads', () => [])

  async function carregar() {
    const inicio = new Date(desde('30d')).toISOString()
    const [c, l] = await Promise.all([
      supabase.from('cliques_entrada').select('origem, categoria_id, criado_em').gte('criado_em', inicio).limit(20_000),
      supabase.from('leads').select('*').gte('criado_em', inicio).order('criado_em', { ascending: false })
    ])
    if (c.error || l.error) throw c.error ?? l.error
    cliques.value = c.data.map(x => ({ origem: x.origem, categoriaId: x.categoria_id, criadoEm: x.criado_em }))
    leads.value = l.data.map(x => ({
      id: x.id, nome: x.nome, numero: x.numero, palavraChave: x.palavra_chave,
      categoriaId: x.categoria_id, criadoEm: x.criado_em, entrou: x.entrou
    }))
    return true
  }

  const doPeriodo = <T extends { criadoEm: string }>(lista: T[], p: Periodo) =>
    lista.filter(x => new Date(x.criadoEm).getTime() >= desde(p))

  function contar(lista: Clique[], chave: (c: Clique) => string) {
    const mapa = new Map<string, number>()
    for (const c of lista) mapa.set(chave(c), (mapa.get(chave(c)) ?? 0) + 1)
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }

  const cliquesPorOrigem = (p: Periodo) =>
    contar(doPeriodo(cliques.value, p), c => c.origem)
      .map(([origem, valor]) => ({ chave: origem, rotulo: ORIGENS[origem] ?? origem, valor }))

  const cliquesPorCategoria = (p: Periodo) =>
    contar(doPeriodo(cliques.value, p), c => c.categoriaId ?? '')
      .map(([id, valor]) => ({ id, valor }))

  const leadsDoPeriodo = (p: Periodo) => doPeriodo(leads.value, p)

  // Depende do aviso de "participante entrou" da UazAPI. null = ainda não disponível
  const novosMembros = (_p: Periodo): number | null => null

  return { leads, carregar, cliquesPorOrigem, cliquesPorCategoria, leadsDoPeriodo, novosMembros }
}
