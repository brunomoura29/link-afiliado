// Categorias (Supabase: categorias) e grupos do WhatsApp (Supabase: whatsapp_destinos).
// Os grupos chegam pela UazAPI; até ela ser ligada, a lista fica vazia.
// TODO (UazAPI, pedir a doc): listar grupos, nº de participantes, se o número é admin,
// obter/revogar convite, criar grupo e configurar nome/foto/descrição/"só admins".
import type { Tables, TablesInsert } from '~/types/database.types'

export interface CategoriaGrupo {
  id: string
  nome: string
  emoji: string
  slug: string // link de entrada /g/<slug> (único no sistema todo)
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

const daLinhaCategoria = (c: Tables<'categorias'>): CategoriaGrupo => ({
  id: c.id,
  nome: c.nome,
  emoji: c.emoji,
  slug: c.slug,
  palavraChave: c.palavra_chave ?? '',
  descricao: c.descricao,
  ativa: c.ativa,
  autoCriar: c.auto_criar,
  padraoNome: c.padrao_nome,
  soAdmins: c.so_admins
})

const paraLinhaCategoria = (c: CategoriaGrupo): TablesInsert<'categorias'> => ({
  nome: c.nome.trim(),
  emoji: c.emoji,
  slug: c.slug,
  palavra_chave: c.palavraChave.trim() || null,
  descricao: c.descricao.trim(),
  ativa: c.ativa,
  auto_criar: c.autoCriar,
  padrao_nome: c.padraoNome.trim(),
  so_admins: c.soAdmins
})

const daLinhaGrupo = (g: Tables<'whatsapp_destinos'>): Grupo => ({
  id: g.id,
  nome: g.nome,
  membros: g.membros,
  capacidade: g.capacidade,
  admin: g.admin,
  categoriaId: g.categoria_id,
  ordem: g.ordem,
  recebeOfertas: g.recebe_ofertas,
  convite: g.convite_url
})

export type ErroSalvarCategoria = 'slug' | 'palavraChave' | 'outro' | null

export function useGrupos() {
  const supabase = useSupabaseClient()
  const toast = useToast()
  const categorias = useState<CategoriaGrupo[]>('categorias', () => [])
  const grupos = useState<Grupo[]>('grupos', () => [])

  async function carregar() {
    const [cats, dests] = await Promise.all([
      supabase.from('categorias').select('*').order('criado_em'),
      supabase.from('whatsapp_destinos').select('*').eq('tipo', 'grupo').order('ordem')
    ])
    if (cats.error || dests.error) throw cats.error ?? dests.error
    categorias.value = cats.data.map(daLinhaCategoria)
    grupos.value = dests.data.map(daLinhaGrupo)
    return true
  }

  const daCategoria = (categoriaId: string | null) =>
    grupos.value.filter(g => g.categoriaId === categoriaId).sort((a, b) => a.ordem - b.ordem)

  const lotado = (g: Grupo) => g.membros >= g.capacidade * LIMITE_ENTRADA

  // O primeiro da ordem que ainda tem espaço e onde o número é admin (precisa do convite)
  function entradaAtiva(categoriaId: string) {
    return daCategoria(categoriaId).find(g => g.admin && g.convite && !lotado(g)) ?? null
  }

  const urlBase = useUrlBase()
  const linkEntrada = (c: CategoriaGrupo) => `${urlBase}/g/${c.slug}`

  // ── Categorias ──

  async function salvarCategoria(dados: CategoriaGrupo, nova: boolean): Promise<ErroSalvarCategoria> {
    const linha = paraLinhaCategoria(dados)
    const { data, error } = nova
      ? await supabase.from('categorias').insert(linha).select().single()
      : await supabase.from('categorias').update(linha).eq('id', dados.id).select().single()
    if (error) {
      // Índices únicos: endereço (no sistema todo) e palavra-chave (por cliente)
      if (error.code === '23505') return error.message.includes('slug') ? 'slug' : 'palavraChave'
      return 'outro'
    }
    const salva = daLinhaCategoria(data)
    const i = categorias.value.findIndex(c => c.id === salva.id)
    if (i >= 0) categorias.value[i] = salva
    else categorias.value.push(salva)
    return null
  }

  // Os grupos dela voltam para "sem categoria" e param de receber ofertas
  async function excluirCategoria(id: string) {
    await supabase.from('whatsapp_destinos').update({ recebe_ofertas: false }).eq('categoria_id', id)
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw error
    for (const g of grupos.value) {
      if (g.categoriaId === id) {
        g.categoriaId = null
        g.recebeOfertas = false
      }
    }
    categorias.value = categorias.value.filter(c => c.id !== id)
  }

  // ── Grupos ──

  // Muda no banco e na tela; se falhar, desfaz na tela e avisa
  async function atualizarGrupo(g: Grupo, mudancas: Partial<Grupo>) {
    const antes = { ...g }
    Object.assign(g, mudancas)
    const { error } = await supabase.from('whatsapp_destinos').update({
      categoria_id: g.categoriaId,
      ordem: g.ordem,
      recebe_ofertas: g.recebeOfertas
    }).eq('id', g.id)
    if (error) {
      Object.assign(g, antes)
      toast.erro('Não foi possível salvar', 'Verifique sua internet e tente de novo.')
    }
  }

  const definirOfertas = (g: Grupo, recebe: boolean) => atualizarGrupo(g, { recebeOfertas: recebe })

  function definirCategoria(g: Grupo, categoriaId: string | null) {
    const ordem = (daCategoria(categoriaId).filter(x => x.id !== g.id).at(-1)?.ordem ?? 0) + 1
    return atualizarGrupo(g, { categoriaId, ordem, recebeOfertas: !!categoriaId })
  }

  async function mover(g: Grupo, direcao: -1 | 1) {
    const lista = daCategoria(g.categoriaId)
    const outro = lista[lista.findIndex(x => x.id === g.id) + direcao]
    if (!outro) return
    const [a, b] = [g.ordem, outro.ordem]
    await Promise.all([atualizarGrupo(g, { ordem: b }), atualizarGrupo(outro, { ordem: a })])
  }

  // "Achadinhos Casa #" → "Achadinhos Casa #4"
  function proximoNomeGrupo(c: CategoriaGrupo) {
    const n = daCategoria(c.id).length + 1
    const padrao = c.padraoNome.trim() || c.nome
    return padrao.includes('#') ? padrao.replace('#', `#${n}`) : `${padrao} ${n}`
  }

  // Dependem da UazAPI (ainda não ligada)
  const depoisDaUazapi = () => {
    toast.info('Disponível em breve', 'Funciona quando o WhatsApp for ligado pela UazAPI.')
    return null
  }
  // null = não disponível ainda (já avisou com toast)
  const sincronizar = async (): Promise<number | null> => depoisDaUazapi()
  const novoConvite = async (_g: Grupo): Promise<string | null> => depoisDaUazapi()
  const criarGrupo = async (_c: CategoriaGrupo, _nome: string, _soAdmins: boolean): Promise<Grupo | null> => depoisDaUazapi()

  return {
    categorias, grupos, carregar, daCategoria, lotado, entradaAtiva, linkEntrada,
    salvarCategoria, excluirCategoria,
    definirOfertas, definirCategoria, mover, proximoNomeGrupo,
    sincronizar, novoConvite, criarGrupo
  }
}
