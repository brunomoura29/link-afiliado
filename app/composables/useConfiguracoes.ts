// Regras de envio, estilo da legenda e dados da conta. Por enquanto simulado.
// TODO (Supabase): tabela config (owner_id + chaves) e perfil do usuário.

export interface Configuracoes {
  limiteDiario: number // ofertas por grupo por dia
  intervaloMin: number // minutos
  intervaloMax: number
  pausaNoturna: boolean
  inicio: string // "07:00"
  fim: string // "23:00"
  tom: 'animado' | 'direto' | 'profissional'
  emojis: boolean
  rodape: string // texto fixo no fim de toda legenda
  nome: string
  email: string
  telefone: string
}

const PADRAO: Configuracoes = {
  limiteDiario: 8,
  intervaloMin: 10,
  intervaloMax: 25,
  pausaNoturna: true,
  inicio: '07:00',
  fim: '23:00',
  tom: 'animado',
  emojis: true,
  rodape: '',
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  telefone: '(11) 98765-4821'
}

export function useConfiguracoes() {
  const config = useState<Configuracoes>('configuracoes', () => ({ ...PADRAO }))

  async function salvar(novas: Configuracoes) {
    await new Promise(r => setTimeout(r, 900))
    config.value = { ...novas }
  }

  return { config, salvar }
}
