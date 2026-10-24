// Captação de membros: cliques nos links de entrada (/g/...) e pessoas que pediram
// o convite pela palavra-chave. Por enquanto simulado.
// TODO (Supabase): cliques_entrada + leads. TODO (UazAPI): webhook de mensagem recebida
// (palavra-chave) e de participante que entrou no grupo.

export type Periodo = 'hoje' | '7d' | '30d'

export interface Lead {
  id: string
  nome: string
  numero: string
  palavraChave: string
  categoriaId: string
  criadoEm: string
  entrou: boolean // entrou no grupo depois de receber o convite
}

export const ORIGENS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  bio: 'Link na bio',
  whatsapp: 'Status do WhatsApp',
  facebook: 'Facebook',
  direto: 'Direto / sem origem'
}

// Cliques nos últimos 30 dias; os outros períodos são uma fração
const CLIQUES_30D: Record<string, number> = { instagram: 1240, tiktok: 860, bio: 512, whatsapp: 344, facebook: 120, direto: 208 }
const POR_CATEGORIA_30D: Record<string, number> = { casa: 1910, eletronicos: 902, beleza: 472 }
// Entradas nos grupos (webhook de participante) — conta todo mundo, não só quem pediu
const NOVOS_MEMBROS_30D = 1838
const FRACAO: Record<Periodo, number> = { hoje: .045, '7d': .27, '30d': 1 }

const minAtras = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const NOMES = ['Juliana', 'Carlos', 'Fernanda', 'Rafael', 'Patrícia', 'Marcos', 'Aline', 'Bruno', 'Camila', 'Diego', 'Larissa', 'Thiago']
const CATS = ['casa', 'casa', 'eletronicos', 'beleza', 'casa', 'eletronicos']
const PALAVRAS: Record<string, string> = { casa: 'QUERO CASA', eletronicos: 'QUERO TECH', beleza: 'QUERO BELEZA' }

const LEADS: Lead[] = NOMES.map((nome, i) => {
  const categoriaId = CATS[i % CATS.length]!
  return {
    id: `ld${i}`,
    nome,
    numero: `+55 (${11 + (i % 9) * 10}) 9${String(8100 + i * 137).slice(0, 4)}-${String(2300 + i * 911).slice(-4)}`,
    palavraChave: PALAVRAS[categoriaId]!,
    categoriaId,
    criadoEm: minAtras([3, 18, 40, 95, 180, 300, 60 * 26, 60 * 30, 60 * 52, 60 * 24 * 4, 60 * 24 * 9, 60 * 24 * 20][i]!),
    entrou: i % 3 !== 1
  }
})

const LIMITE: Record<Periodo, number> = { hoje: 24 * 60, '7d': 7 * 24 * 60, '30d': 30 * 24 * 60 }

export function useLeads() {
  const leads = useState<Lead[]>('leads', () => structuredClone(LEADS))

  const cliquesPorOrigem = (p: Periodo) =>
    Object.entries(CLIQUES_30D)
      .map(([origem, n]) => ({ chave: origem, rotulo: ORIGENS[origem]!, valor: Math.round(n * FRACAO[p]) }))
      .sort((a, b) => b.valor - a.valor)

  const cliquesPorCategoria = (p: Periodo) =>
    Object.entries(POR_CATEGORIA_30D).map(([id, n]) => ({ id, valor: Math.round(n * FRACAO[p]) })).sort((a, b) => b.valor - a.valor)

  const leadsDoPeriodo = (p: Periodo) => {
    const desde = Date.now() - LIMITE[p] * 60_000
    return leads.value.filter(l => new Date(l.criadoEm).getTime() >= desde).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  }

  const novosMembros = (p: Periodo) => Math.round(NOVOS_MEMBROS_30D * FRACAO[p])

  return { leads, cliquesPorOrigem, cliquesPorCategoria, leadsDoPeriodo, novosMembros }
}
