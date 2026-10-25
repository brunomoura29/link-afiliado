// Conexão do WhatsApp do cliente (UazAPI, pelo servidor).
// Real: status (GET /api/whatsapp/status). Ainda simulado até chegar a doc da UazAPI:
// conectar por QR / código pelo número e desconectar.

export type StatusWhatsapp = 'desconectado' | 'gerando' | 'aguardando' | 'conectando' | 'conectado'
export type ModoConexao = 'codigo' | 'qr'

interface EstadoWhatsapp {
  status: StatusWhatsapp
  carregado: boolean
  semInstancia: boolean // ainda não tem instância na UazAPI (criada ao conectar)
  erro: string | null
  modo: ModoConexao
  numero: string // formatado: +55 (85) 9438-7766
  nomePerfil: string
  foto: string | null
  conectadoEm: string | null // ISO
  motivoDesconexao: string | null
  codigo: string // código de pareamento (modo "codigo")
  semente: number // muda a cada novo QR
  expiraEm: number | null // timestamp do vencimento do código/QR
  tentativas: number
}

const VALIDADE_MS = 45_000
const MAX_TENTATIVAS = 3

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 8; i++) c += letras[Math.floor(Math.random() * letras.length)]
  return `${c.slice(0, 4)}-${c.slice(4)}`
}

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useWhatsapp() {
  const toast = useToast()
  const estado = useState<EstadoWhatsapp>('whatsapp', () => ({
    status: 'desconectado',
    carregado: false,
    semInstancia: false,
    erro: null,
    modo: 'codigo',
    numero: '',
    nomePerfil: '',
    foto: null,
    conectadoEm: null,
    motivoDesconexao: null,
    codigo: '',
    semente: 1,
    expiraEm: null,
    tentativas: 0
  }))

  const conectado = computed(() => estado.value.status === 'conectado')

  // Lê o status na UazAPI (pelo servidor)
  async function carregarStatus() {
    const e = estado.value
    try {
      const r = await $fetch('/api/whatsapp/status', { headers: useRequestHeaders(['cookie']) })
      e.carregado = true
      e.erro = null
      e.semInstancia = r.situacao === 'sem_instancia'
      if (r.situacao !== 'ok') {
        if (r.situacao === 'instancia_invalida') e.erro = r.mensagem
        // Durante o fluxo de conexão (simulado) não sobrescreve o que está na tela
        if (!['gerando', 'aguardando', 'conectando'].includes(e.status)) e.status = 'desconectado'
        return true
      }
      if (['gerando', 'aguardando', 'conectando'].includes(e.status) && r.status !== 'conectado') return true
      e.status = r.status as StatusWhatsapp
      e.numero = formatarNumeroWhatsapp(r.numero)
      e.nomePerfil = r.nomePerfil ?? ''
      e.foto = r.foto ?? null
      e.conectadoEm = r.conectadoEm ?? null
      e.motivoDesconexao = r.motivoDesconexao ?? null
    } catch {
      e.carregado = true
      e.erro = 'Não foi possível consultar o WhatsApp agora.'
    }
    return true
  }

  // ── Conexão (simulada até chegar a doc da UazAPI) ──

  async function gerar(modo: ModoConexao, numero?: string) {
    const e = estado.value
    e.modo = modo
    if (numero) e.numero = numero
    e.status = 'gerando'
    e.tentativas = 0
    await espera(900)
    renovar()
  }

  // Código/QR vencem; renova algumas vezes e depois desiste
  function renovar() {
    const e = estado.value
    if (e.tentativas >= MAX_TENTATIVAS) {
      e.status = 'desconectado'
      e.expiraEm = null
      return false
    }
    e.tentativas++
    e.codigo = gerarCodigo()
    e.semente = Math.random()
    e.expiraEm = Date.now() + VALIDADE_MS
    e.status = 'aguardando'
    return true
  }

  async function simularLeitura() {
    const e = estado.value
    e.status = 'conectando'
    await espera(1400)
    e.status = 'conectado'
    e.conectadoEm = new Date().toISOString()
    e.expiraEm = null
    if (!e.nomePerfil) e.nomePerfil = 'Meu WhatsApp'
  }

  function cancelar() {
    estado.value.status = 'desconectado'
    estado.value.expiraEm = null
  }

  // TODO: doc de desconectar da UazAPI. false = não feito (já avisou)
  async function desconectar() {
    toast.info('Disponível em breve', 'Desconectar pelo app entra junto com a próxima parte da UazAPI.')
    return false
  }

  return { estado, conectado, carregarStatus, gerar, renovar, simularLeitura, cancelar, desconectar }
}
