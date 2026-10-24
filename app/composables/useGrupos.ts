// Grupos do WhatsApp do cliente e a ligação com as categorias. Por enquanto simulado.
// TODO (UazAPI, pedir a doc): listar grupos, nº de participantes, se o número é admin,
// obter/revogar convite, criar grupo e configurar nome/foto/descrição/"só admins".
// TODO (Supabase): whatsapp_destinos + categorias.

export interface CategoriaGrupo {
  id: string
  nome: string
  emoji: string
  slug: string // link de entrada /g/<slug>
  palavraChave: string // "QUERO CASA" → responde com o convite
  descricao: string // texto da página de entrada
  ativa: boolean // pausada = nada é enviado para os grupos dela
  autoCriar: boolean // cria o próximo grupo quando o último lota
  padraoNome: string // nome dos grupos novos; "#" vira o número
  soAdmins: boolean // grupos novos só deixam admins enviarem
}

export interface Grupo {
  id: string
  nome: string
  membros: number
  capacidade: number
  admin: boolean
  categoriaId: string | null
  ordem: number // ordem na rotação de entrada dentro da categoria
  recebeOfertas: boolean
  convite: string | null
}

// Acima disso o grupo para de receber novos membros e o próximo assume
export const LIMITE_ENTRADA = .9
export const URL_BASE = 'https://linkafiliado.app'

const CATEGORIAS: CategoriaGrupo[] = [
  { id: 'casa', nome: 'Casa e Cozinha', emoji: '🏠', slug: 'casa-cozinha', palavraChave: 'QUERO CASA', descricao: 'Os melhores descontos para sua casa, todos os dias.', ativa: true, autoCriar: true, padraoNome: 'Achadinhos Casa #', soAdmins: true },
  { id: 'eletronicos', nome: 'Eletrônicos', emoji: '🎧', slug: 'eletronicos', palavraChave: 'QUERO TECH', descricao: 'Fones, carregadores e gadgets em promoção.', ativa: true, autoCriar: false, padraoNome: 'Tech Ofertas #', soAdmins: true },
  { id: 'beleza', nome: 'Beleza', emoji: '💄', slug: 'beleza', palavraChave: 'QUERO BELEZA', descricao: 'Maquiagem, skincare e perfumes com desconto.', ativa: true, autoCriar: false, padraoNome: 'Beleza Barata #', soAdmins: true }
]

const GRUPOS: Grupo[] = [
  { id: 'g1', nome: 'Achadinhos Casa #1', membros: 1024, capacidade: 1024, admin: true, categoriaId: 'casa', ordem: 1, recebeOfertas: true, convite: 'https://chat.whatsapp.com/Ab12Cd34Ef56' },
  { id: 'g2', nome: 'Achadinhos Casa #2', membros: 823, capacidade: 1024, admin: true, categoriaId: 'casa', ordem: 2, recebeOfertas: true, convite: 'https://chat.whatsapp.com/Gh78Ij90Kl12' },
  { id: 'g3', nome: 'Achadinhos Casa #3', membros: 12, capacidade: 1024, admin: true, categoriaId: 'casa', ordem: 3, recebeOfertas: true, convite: 'https://chat.whatsapp.com/Mn34Op56Qr78' },
  { id: 'g4', nome: 'Tech Ofertas 🎧', membros: 640, capacidade: 1024, admin: true, categoriaId: 'eletronicos', ordem: 1, recebeOfertas: true, convite: 'https://chat.whatsapp.com/St90Uv12Wx34' },
  { id: 'g5', nome: 'Beleza Barata 💄', membros: 310, capacidade: 1024, admin: false, categoriaId: 'beleza', ordem: 1, recebeOfertas: true, convite: null },
  { id: 'g6', nome: 'Promo Geral VIP', membros: 455, capacidade: 1024, admin: true, categoriaId: null, ordem: 1, recebeOfertas: false, convite: 'https://chat.whatsapp.com/Yz56Ab78Cd90' },
  { id: 'g7', nome: 'Família Souza', membros: 18, capacidade: 1024, admin: false, categoriaId: null, ordem: 2, recebeOfertas: false, convite: null }
]

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useGrupos() {
  const categorias = useState<CategoriaGrupo[]>('categorias-grupos', () => structuredClone(CATEGORIAS))
  const grupos = useState<Grupo[]>('grupos', () => structuredClone(GRUPOS))

  const daCategoria = (categoriaId: string | null) =>
    grupos.value.filter(g => g.categoriaId === categoriaId).sort((a, b) => a.ordem - b.ordem)

  const lotado = (g: Grupo) => g.membros >= g.capacidade * LIMITE_ENTRADA

  // O primeiro da ordem que ainda tem espaço e onde o número é admin (precisa do convite)
  function entradaAtiva(categoriaId: string) {
    return daCategoria(categoriaId).find(g => g.admin && g.convite && !lotado(g)) ?? null
  }

  const linkEntrada = (c: CategoriaGrupo) => `${URL_BASE}/g/${c.slug}`

  async function sincronizar() {
    await espera(1300)
    return grupos.value.length
  }

  function definirCategoria(g: Grupo, categoriaId: string | null) {
    g.categoriaId = categoriaId
    g.ordem = (daCategoria(categoriaId).filter(x => x.id !== g.id).at(-1)?.ordem ?? 0) + 1
    if (categoriaId) g.recebeOfertas = true
  }

  function mover(g: Grupo, direcao: -1 | 1) {
    const lista = daCategoria(g.categoriaId)
    const i = lista.findIndex(x => x.id === g.id)
    const outro = lista[i + direcao]
    if (!outro) return
    ;[g.ordem, outro.ordem] = [outro.ordem, g.ordem]
  }

  async function novoConvite(g: Grupo) {
    await espera(800)
    g.convite = `https://chat.whatsapp.com/${Math.random().toString(36).slice(2, 14)}`
  }

  // "Achadinhos Casa #" → "Achadinhos Casa #4"
  function proximoNomeGrupo(c: CategoriaGrupo) {
    const n = daCategoria(c.id).length + 1
    const padrao = c.padraoNome.trim() || c.nome
    return padrao.includes('#') ? padrao.replace('#', `#${n}`) : `${padrao} ${n}`
  }

  async function criarGrupo(c: CategoriaGrupo, nome: string, soAdmins: boolean) {
    await espera(1600)
    const g: Grupo = {
      id: `g${Date.now()}`,
      nome: nome.trim(),
      membros: 1, // o próprio número
      capacidade: 1024,
      admin: true,
      categoriaId: c.id,
      ordem: (daCategoria(c.id).at(-1)?.ordem ?? 0) + 1,
      recebeOfertas: true,
      convite: `https://chat.whatsapp.com/${Math.random().toString(36).slice(2, 14)}`
    }
    void soAdmins // TODO: configurar "só admins enviam" na UazAPI
    grupos.value.push(g)
    return g
  }

  // Cria ou atualiza
  async function salvarCategoria(dados: CategoriaGrupo) {
    await espera(700)
    const existente = categorias.value.find(c => c.id === dados.id)
    if (existente) Object.assign(existente, dados)
    else categorias.value.push({ ...dados })
  }

  // Os grupos dela voltam para "sem categoria"
  async function excluirCategoria(id: string) {
    await espera(700)
    for (const g of grupos.value) {
      if (g.categoriaId === id) {
        g.categoriaId = null
        g.recebeOfertas = false
      }
    }
    categorias.value = categorias.value.filter(c => c.id !== id)
  }

  return {
    categorias, grupos, daCategoria, lotado, entradaAtiva, linkEntrada, sincronizar, definirCategoria, mover, novoConvite,
    proximoNomeGrupo, criarGrupo, salvarCategoria, excluirCategoria
  }
}
