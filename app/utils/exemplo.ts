// Dados de exemplo enquanto o backend não existe. Substituir por chamadas ao Supabase.
import type { Plataforma } from '#shared/utils/plataforma'

export interface OfertaPublica {
  titulo: string
  plataforma: Plataforma
  preco: number
  original: number
  matiz: number
}

export interface GrupoPublico {
  slug: string
  nome: string
  emoji: string
  descricao: string
  dono: string
  membros: number
  ofertasPorDia: number
  convite: string | null // null = todos os grupos lotados
  ofertas: OfertaPublica[]
}

const OFERTAS_CASA: OfertaPublica[] = [
  { titulo: 'Air fryer 4L digital, 1500W, cesto antiaderente', plataforma: 'mercado_livre', preco: 299, original: 449, matiz: 48 },
  { titulo: 'Kit 6 potes herméticos de vidro com tampa bambu', plataforma: 'shopee', preco: 54.9, original: 89.9, matiz: 20 },
  { titulo: 'Jogo de panelas antiaderente 5 peças', plataforma: 'tiktok', preco: 189.9, original: 329.9, matiz: 190 },
  { titulo: 'Organizador de geladeira acrílico, kit 4', plataforma: 'amazon', preco: 42.5, original: 79.9, matiz: 150 }
]

const GRUPOS: Record<string, GrupoPublico> = {
  'casa-cozinha': {
    slug: 'casa-cozinha',
    nome: 'Achadinhos Casa e Cozinha',
    emoji: '🏠',
    descricao: 'Os melhores descontos da Shopee, Mercado Livre, Amazon e outras lojas para sua casa, todos os dias.',
    dono: 'Loja da Ana',
    membros: 1847,
    ofertasPorDia: 8,
    convite: 'https://chat.whatsapp.com/EXEMPLO',
    ofertas: OFERTAS_CASA
  },
  'lotado': {
    slug: 'lotado',
    nome: 'Achadinhos Eletrônicos',
    emoji: '🎧',
    descricao: 'Fones, carregadores, gadgets e tudo de tecnologia em promoção.',
    dono: 'Loja da Ana',
    membros: 3072,
    ofertasPorDia: 6,
    convite: null,
    ofertas: OFERTAS_CASA.slice(0, 2)
  }
}

export const PAINEL_EXEMPLO = {
  hoje: { ofertas: 12, enviadas: 34, naFila: 3, rejeitadas: 1, cliquesEntrada: 87 },
  linkFormulario: 'https://linkafiliado.app/f/a8Kx92mPq7Zt',
  linkEntrada: 'https://linkafiliado.app/g/casa-cozinha'
}

export const buscarGrupoExemplo = (slug: string) => GRUPOS[slug] ?? null
