// Links do formulário público (/f/<token>) que o cliente manda para os assistentes.
// Por enquanto simulado. TODO (Supabase): tabela links_formulario (owner_id, token unique,
// nome, ativo, criado_em) + contagem de ofertas por link_formulario_id.
import { URL_BASE } from './useGrupos'

export interface LinkFormulario {
  id: string
  nome: string
  token: string
  ativo: boolean
  criadoEm: string
  ultimoUso: string | null
  ofertasTotal: number
  ofertasHoje: number
}

const minAtras = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

const LINKS: LinkFormulario[] = [
  { id: 'l1', nome: 'Assistente João', token: 'a8Kx92mPq7Zt', ativo: true, criadoEm: minAtras(60 * 24 * 45), ultimoUso: minAtras(12), ofertasTotal: 214, ofertasHoje: 9 },
  { id: 'l2', nome: 'Maria (fim de semana)', token: 'Qp3Lm7Zx2Wc9', ativo: true, criadoEm: minAtras(60 * 24 * 20), ultimoUso: minAtras(60 * 24 * 2), ofertasTotal: 58, ofertasHoje: 0 },
  { id: 'l3', nome: 'Link antigo', token: 'Zz9Yy8Xx7Ww6', ativo: false, criadoEm: minAtras(60 * 24 * 90), ultimoUso: minAtras(60 * 24 * 40), ofertasTotal: 31, ofertasHoje: 0 }
]

// Token longo e aleatório: é a única proteção do link público
function gerarToken(tamanho = 12) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho))
  return Array.from(bytes, b => letras[b % letras.length]).join('')
}

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useLinks() {
  const links = useState<LinkFormulario[]>('links-formulario', () => structuredClone(LINKS))

  const urlDo = (l: LinkFormulario) => `${URL_BASE}/f/${l.token}`

  async function criar(nome: string) {
    await espera(900)
    const l: LinkFormulario = {
      id: `l${Date.now()}`,
      nome: nome.trim(),
      token: gerarToken(),
      ativo: true,
      criadoEm: new Date().toISOString(),
      ultimoUso: null,
      ofertasTotal: 0,
      ofertasHoje: 0
    }
    links.value.unshift(l)
    return l
  }

  // O token antigo para de funcionar na hora
  async function regenerar(l: LinkFormulario) {
    await espera(800)
    l.token = gerarToken()
  }

  async function excluir(l: LinkFormulario) {
    await espera(600)
    links.value = links.value.filter(x => x.id !== l.id)
  }

  return { links, urlDo, criar, regenerar, excluir }
}
