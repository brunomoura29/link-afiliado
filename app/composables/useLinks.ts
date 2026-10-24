// Links do formulário público (/f/<token>) que o cliente manda para os assistentes.
// Supabase: links_formulario (o token é gerado pelo banco) + contagem em ofertas.
import type { Tables } from '~/types/database.types'

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

const daLinha = (l: Tables<'links_formulario'>): LinkFormulario => ({
  id: l.id,
  nome: l.nome,
  token: l.token,
  ativo: l.ativo,
  criadoEm: l.criado_em,
  ultimoUso: l.ultimo_uso,
  ofertasTotal: 0,
  ofertasHoje: 0
})

export function useLinks() {
  const supabase = useSupabaseClient()
  const links = useState<LinkFormulario[]>('links-formulario', () => [])
  const urlBase = useUrlBase()

  const urlDo = (l: LinkFormulario) => `${urlBase}/f/${l.token}`

  async function carregar() {
    const [ls, ofs] = await Promise.all([
      supabase.from('links_formulario').select('*').order('criado_em', { ascending: false }),
      // TODO: trocar por contagem no banco (view/RPC) quando o volume crescer
      supabase.from('ofertas').select('link_formulario_id, criado_em').not('link_formulario_id', 'is', null)
    ])
    if (ls.error || ofs.error) throw ls.error ?? ofs.error
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)
    links.value = ls.data.map((linha) => {
      const l = daLinha(linha)
      const dele = ofs.data.filter(o => o.link_formulario_id === l.id)
      l.ofertasTotal = dele.length
      l.ofertasHoje = dele.filter(o => new Date(o.criado_em) >= inicioHoje).length
      return l
    })
    return true
  }

  async function criar(nome: string) {
    const { data, error } = await supabase.from('links_formulario').insert({ nome: nome.trim() }).select().single()
    if (error) throw error
    const l = daLinha(data)
    links.value.unshift(l)
    return l
  }

  async function atualizar(l: LinkFormulario, mudancas: { nome?: string, ativo?: boolean }) {
    const { error } = await supabase.from('links_formulario').update(mudancas).eq('id', l.id)
    if (error) throw error
    Object.assign(l, mudancas)
  }

  // O token antigo para de funcionar na hora
  async function regenerar(l: LinkFormulario) {
    const { data: token, error: e1 } = await supabase.rpc('gerar_token')
    if (e1 || !token) throw e1
    const { error } = await supabase.from('links_formulario').update({ token }).eq('id', l.id)
    if (error) throw error
    l.token = token
  }

  async function excluir(l: LinkFormulario) {
    const { error } = await supabase.from('links_formulario').delete().eq('id', l.id)
    if (error) throw error
    links.value = links.value.filter(x => x.id !== l.id)
  }

  return { links, urlDo, carregar, criar, atualizar, regenerar, excluir }
}
