// Ofertas recebidas (formulário público ou painel) e o andamento de cada uma.
// Por enquanto simulado. TODO (Supabase): ofertas + postagens + envios; status real
// vem do enriquecimento, do filtro de regras e da fila de envio.
import type { Plataforma, StatusPostagem } from '#shared/utils/plataforma'

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
  categoriaId: string
  status: StatusPostagem
  motivo?: string
  legenda: string | null
  link: string
  origem: string // nome do link do formulário ou "Você"
  criadaEm: string
  matiz: number
  envios: Envio[]
}

const minAtras = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const DIA = 60 * 24

const ABERTURAS = ['🔥 Achado do dia!', 'Olha esse preço 👀', 'Corre que tá barato!', 'Promoção relâmpago ⚡', 'Pra quem tava esperando baixar 👇']

// Mock da IA: o texto muda, mas preço/desconto vêm sempre dos dados lidos do produto
function escreverLegenda(o: Pick<Oferta, 'titulo' | 'preco' | 'original' | 'link'>, variacao = 0) {
  if (!o.titulo || o.preco == null) return null
  const abertura = ABERTURAS[variacao % ABERTURAS.length]
  const de = o.original ? `de ${formatarPreco(o.original)} por ` : 'por '
  const desconto = o.original ? ` (${Math.round((1 - o.preco / o.original) * 100)}% OFF)` : ''
  return `${abertura} ${o.titulo} ${de}${formatarPreco(o.preco)}${desconto}\n\n👉 ${o.link}`
}

function oferta(dados: Omit<Oferta, 'legenda' | 'id'> & { id: string }, variacao = 0): Oferta {
  return { ...dados, legenda: escreverLegenda(dados, variacao) }
}

const OFERTAS: Oferta[] = [
  oferta({ id: 'o1', titulo: 'Fone Bluetooth com cancelamento de ruído, bateria 40h', plataforma: 'mercado_livre', preco: 129.9, original: 199.9, categoriaId: 'eletronicos', status: 'enviada', link: 'https://meli.la/2xYp8Qa', origem: 'Assistente João', criadaEm: minAtras(4), matiz: 210, envios: [{ grupo: 'Tech Ofertas 🎧', status: 'enviado', quando: minAtras(2) }] }, 1),
  oferta({ id: 'o2', titulo: 'Kit 6 potes herméticos de vidro com tampa bambu', plataforma: 'shopee', preco: 54.9, original: 89.9, categoriaId: 'casa', status: 'aprovada', link: 'https://s.shopee.com.br/8AbC12xyz', origem: 'Assistente João', criadaEm: minAtras(9), matiz: 20, envios: [{ grupo: 'Achadinhos Casa #1', status: 'enviado', quando: minAtras(5) }, { grupo: 'Achadinhos Casa #2', status: 'na_fila', quando: null }, { grupo: 'Achadinhos Casa #3', status: 'na_fila', quando: null }] }, 0),
  oferta({ id: 'o3', titulo: null, plataforma: 'mercado_livre', preco: null, original: null, categoriaId: 'casa', status: 'pendente', link: 'https://meli.la/9Lp2cXz', origem: 'Maria (fim de semana)', criadaEm: minAtras(1), matiz: 48, envios: [] }),
  oferta({ id: 'o4', titulo: 'Sérum facial vitamina C 30ml', plataforma: 'amazon', preco: null, original: null, categoriaId: 'beleza', status: 'rejeitada', motivo: 'A Amazon bloqueou a leitura da página do produto. Não dá para conferir o preço.', link: 'https://amzn.to/3xKp9Qa', origem: 'Assistente João', criadaEm: minAtras(31), matiz: 330, envios: [] }),
  oferta({ id: 'o5', titulo: 'Jogo de panelas antiaderente 5 peças', plataforma: 'tiktok', preco: 189.9, original: 329.9, categoriaId: 'casa', status: 'enviada', link: 'https://vm.tiktok.com/ZMh8k2Lp/', origem: 'Você', criadaEm: minAtras(70), matiz: 190, envios: [{ grupo: 'Achadinhos Casa #1', status: 'enviado', quando: minAtras(60) }, { grupo: 'Achadinhos Casa #2', status: 'enviado', quando: minAtras(52) }, { grupo: 'Achadinhos Casa #3', status: 'erro', quando: minAtras(45) }] }, 2),
  oferta({ id: 'o6', titulo: 'Smartwatch com GPS e monitor cardíaco', plataforma: 'magalu', preco: 199, original: 349, categoriaId: 'eletronicos', status: 'enviada', link: 'https://maga.lu/aB3xK', origem: 'Assistente João', criadaEm: minAtras(190), matiz: 260, envios: [{ grupo: 'Tech Ofertas 🎧', status: 'enviado', quando: minAtras(180) }] }, 3),
  oferta({ id: 'o7', titulo: 'Organizador de geladeira acrílico, kit 4', plataforma: 'amazon', preco: 42.5, original: 79.9, categoriaId: 'casa', status: 'enviada', link: 'https://amzn.to/4bQw2Lm', origem: 'Maria (fim de semana)', criadaEm: minAtras(DIA + 120), matiz: 150, envios: [{ grupo: 'Achadinhos Casa #1', status: 'enviado', quando: minAtras(DIA + 100) }, { grupo: 'Achadinhos Casa #2', status: 'enviado', quando: minAtras(DIA + 92) }] }, 4),
  oferta({ id: 'o8', titulo: 'Carregador turbo 65W USB-C', plataforma: 'aliexpress', preco: 39.9, original: 89.9, categoriaId: 'eletronicos', status: 'rejeitada', motivo: 'Esse link já tinha sido enviado antes (oferta duplicada).', link: 'https://s.click.aliexpress.com/e/_DkP2x', origem: 'Assistente João', criadaEm: minAtras(DIA + 300), matiz: 0, envios: [] }),
  oferta({ id: 'o9', titulo: 'Paleta de sombras 18 cores', plataforma: 'shein', preco: 59.9, original: 99.9, categoriaId: 'beleza', status: 'enviada', link: 'https://onelink.shein.com/7/4kXp', origem: 'Você', criadaEm: minAtras(DIA + 500), matiz: 300, envios: [{ grupo: 'Beleza Barata 💄', status: 'enviado', quando: minAtras(DIA + 480) }] }, 1),
  oferta({ id: 'o10', titulo: 'Cafeteira elétrica 30 xícaras inox', plataforma: 'mercado_livre', preco: 149.9, original: 219.9, categoriaId: 'casa', status: 'enviada', link: 'https://meli.la/1Qz7Wv', origem: 'Assistente João', criadaEm: minAtras(DIA * 3), matiz: 30, envios: [{ grupo: 'Achadinhos Casa #1', status: 'enviado', quando: minAtras(DIA * 3 - 20) }] }, 2)
]

// Produtos de exemplo para simular a leitura da página
const LEITURAS = [
  { titulo: 'Liquidificador 1200W com 12 velocidades', preco: 119.9, original: 189.9 },
  { titulo: 'Mochila impermeável para notebook 15,6"', preco: 89.9, original: 159.9 },
  { titulo: 'Kit 3 frigideiras cerâmicas antiaderentes', preco: 99.9, original: 179.9 }
]

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useOfertas() {
  const ofertas = useState<Oferta[]>('ofertas', () => structuredClone(OFERTAS))
  const { daCategoria } = useGrupos()
  let variacao = 0

  // Simula: lê o produto → aprova → (fila de envio cuida do resto)
  async function adicionar(categoriaId: string, link: string, plataforma: Plataforma) {
    const o: Oferta = {
      id: `o${Date.now()}`, titulo: null, plataforma, preco: null, original: null, categoriaId,
      status: 'pendente', legenda: null, link, origem: 'Você', criadaEm: new Date().toISOString(),
      matiz: Math.floor(Math.random() * 360), envios: []
    }
    ofertas.value.unshift(o)
    const alvo = () => ofertas.value.find(x => x.id === o.id)
    await espera(2600)
    const lido = LEITURAS[Math.floor(Math.random() * LEITURAS.length)]!
    const atual = alvo()
    if (!atual) return
    Object.assign(atual, lido, { status: 'aprovada' as StatusPostagem })
    atual.legenda = escreverLegenda(atual, variacao++)
    atual.envios = daCategoria(categoriaId)
      .filter(g => g.recebeOfertas)
      .map(g => ({ grupo: g.nome, status: 'na_fila' as const, quando: null }))
  }

  async function novaLegenda(o: Oferta) {
    await espera(1100)
    return escreverLegenda(o, ++variacao) // TODO: chamar a IA de verdade
  }

  async function tentarNovamente(o: Oferta) {
    o.status = 'pendente'
    o.motivo = undefined
    await espera(2200)
    o.status = 'rejeitada'
    o.motivo = 'Ainda não deu para ler a página do produto. Tente mais tarde.'
  }

  async function enviarAgora(o: Oferta) {
    await espera(1200)
    for (const e of o.envios) {
      if (e.status === 'na_fila') {
        e.status = 'enviado'
        e.quando = new Date().toISOString()
      }
    }
    o.status = 'enviada'
  }

  async function excluir(o: Oferta) {
    await espera(600)
    ofertas.value = ofertas.value.filter(x => x.id !== o.id)
  }

  return { ofertas, adicionar, novaLegenda, tentarNovamente, enviarAgora, excluir }
}
