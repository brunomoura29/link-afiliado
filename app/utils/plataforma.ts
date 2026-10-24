// Qualquer programa de afiliados é aceito. As lojas conhecidas ganham nome, cor e
// (no backend) um leitor específico; o resto entra como "outra" com leitura genérica.
export type Plataforma =
  | 'shopee' | 'mercado_livre' | 'amazon' | 'tiktok' | 'magalu' | 'aliexpress' | 'shein' | 'outra'

interface InfoPlataforma {
  nome: string
  cor: string // só para sinalizar (ponto/borda), nunca para recriar a marca
  dominios: string[] // inclui os links curtos de afiliado
}

// TODO: confirmar os domínios curtos usados em cada painel de afiliados.
export const PLATAFORMAS: Record<Plataforma, InfoPlataforma> = {
  shopee: { nome: 'Shopee', cor: 'rgb(var(--shopee))', dominios: ['shopee.com.br', 'shope.ee'] },
  mercado_livre: { nome: 'Mercado Livre', cor: 'rgb(var(--ml-blue))', dominios: ['mercadolivre.com', 'mercadolibre.com', 'mercadolivre.com.br', 'meli.la'] },
  amazon: { nome: 'Amazon', cor: '#ff9900', dominios: ['amazon.com.br', 'amazon.com', 'amzn.to', 'amzn.com', 'a.co'] },
  tiktok: { nome: 'TikTok Shop', cor: '#fe2c55', dominios: ['tiktok.com'] },
  magalu: { nome: 'Magalu', cor: '#0086ff', dominios: ['magazineluiza.com.br', 'magalu.com', 'magazinevoce.com.br', 'maga.lu'] },
  aliexpress: { nome: 'AliExpress', cor: '#e62e04', dominios: ['aliexpress.com', 'aliexpress.us'] },
  shein: { nome: 'Shein', cor: 'rgb(var(--fg))', dominios: ['shein.com', 'shein.com.br'] },
  outra: { nome: 'Outra loja', cor: 'rgb(var(--muted))', dominios: [] }
}

export const nomePlataforma = (p: Plataforma) => PLATAFORMAS[p].nome
export const corPlataforma = (p: Plataforma) => PLATAFORMAS[p].cor

// Aceita link colado sem "https://" (ex.: "meli.la/abc")
export function normalizarLink(link: string) {
  const t = link.trim()
  return /^[a-z][a-z\d+.-]*:/i.test(t) ? t : `https://${t}`
}

// null = não é um link válido; 'outra' = link válido de loja não mapeada
export function detectarPlataforma(link: string): Plataforma | null {
  let url: URL
  try {
    url = new URL(normalizarLink(link))
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  for (const [plataforma, info] of Object.entries(PLATAFORMAS) as [Plataforma, InfoPlataforma][]) {
    if (info.dominios.some(d => host === d || host.endsWith(`.${d}`))) return plataforma
  }
  return 'outra'
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarPreco = (valor: number) => brl.format(valor)

export type StatusPostagem = 'pendente' | 'aprovada' | 'rejeitada' | 'enviada'
