// Regras de envio, estilo da legenda e dados da conta.
// Supabase: configuracoes (criada no cadastro) + perfis. E-mail vem do login.

export interface Configuracoes {
  limiteDiario: number // ofertas por grupo por dia
  intervaloMin: number // minutos
  intervaloMax: number
  pausaNoturna: boolean
  inicio: string // "07:00"
  fim: string // "23:00"
  tom: 'animado' | 'direto' | 'profissional'
  emojis: boolean
  rodape: string
  nome: string
  telefone: string // formatado: (11) 98765-4321
}

export type ErroSalvarConfiguracoes = 'telefone' | 'outro' | null

const PADRAO: Configuracoes = {
  limiteDiario: 8, intervaloMin: 10, intervaloMax: 25, pausaNoturna: true, inicio: '07:00', fim: '23:00',
  tom: 'animado', emojis: true, rodape: '', nome: '', telefone: ''
}

export function useConfiguracoes() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  const { perfil } = usePerfil()
  const config = useState<Configuracoes>('configuracoes', () => ({ ...PADRAO }))
  const email = computed(() => usuario.value?.email ?? '')

  async function carregar() {
    const id = usuario.value?.sub
    if (!id) return false
    const [c, p] = await Promise.all([
      supabase.from('configuracoes').select('*').eq('owner_id', id).single(),
      supabase.from('perfis').select('nome, telefone').eq('id', id).single()
    ])
    if (c.error || p.error) throw c.error ?? p.error
    config.value = {
      limiteDiario: c.data.limite_diario,
      intervaloMin: c.data.intervalo_min,
      intervaloMax: c.data.intervalo_max,
      pausaNoturna: c.data.pausa_noturna,
      inicio: c.data.inicio.slice(0, 5), // o banco devolve "07:00:00"
      fim: c.data.fim.slice(0, 5),
      tom: c.data.tom as Configuracoes['tom'],
      emojis: c.data.emojis,
      rodape: c.data.rodape,
      nome: p.data.nome,
      telefone: formatarTelefone(p.data.telefone ?? '')
    }
    return true
  }

  async function salvar(novas: Configuracoes): Promise<ErroSalvarConfiguracoes> {
    const id = usuario.value?.sub
    if (!id) return 'outro'
    const [c, p] = await Promise.all([
      supabase.from('configuracoes').update({
        limite_diario: novas.limiteDiario,
        intervalo_min: novas.intervaloMin,
        intervalo_max: novas.intervaloMax,
        pausa_noturna: novas.pausaNoturna,
        inicio: novas.inicio,
        fim: novas.fim,
        tom: novas.tom,
        emojis: novas.emojis,
        rodape: novas.rodape.trim()
      }).eq('owner_id', id),
      supabase.from('perfis').update({
        nome: novas.nome.trim(),
        telefone: novas.telefone.replace(/\D/g, '') || null
      }).eq('id', id).select().single()
    ])
    if (p.error?.code === '23505') return 'telefone' // celular já usado por outra conta
    if (c.error || p.error) return 'outro'
    config.value = { ...novas, rodape: novas.rodape.trim(), nome: novas.nome.trim() }
    if (p.data) perfil.value = p.data // atualiza nome no menu
    return null
  }

  async function trocarSenha(nova: string): Promise<'fraca' | 'igual' | 'outro' | null> {
    const { error } = await supabase.auth.updateUser({ password: nova })
    if (!error) return null
    if (error.code === 'weak_password') return 'fraca'
    if (error.code === 'same_password') return 'igual'
    return 'outro'
  }

  // Apaga a conta e tudo dela (o banco apaga em cascata)
  async function excluirConta() {
    await $fetch('/api/conta/excluir', { method: 'POST' })
    await supabase.auth.signOut()
  }

  return { config, email, carregar, salvar, trocarSenha, excluirConta }
}
