// Estado da conexão do WhatsApp do cliente. Por enquanto simulado.
// TODO (UazAPI, pedir a doc ao usuário): criar instância, gerar QR, gerar código
// de pareamento pelo número, consultar status, desconectar, webhook de status.

export type StatusWhatsapp = 'desconectado' | 'gerando' | 'aguardando' | 'conectando' | 'conectado'
export type ModoConexao = 'codigo' | 'qr'

interface EstadoWhatsapp {
  status: StatusWhatsapp
  modo: ModoConexao
  numero: string
  nomePerfil: string
  conectadoEm: string | null // ISO
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
  const estado = useState<EstadoWhatsapp>('whatsapp', () => ({
    status: 'conectado',
    modo: 'codigo',
    numero: '+55 (11) 98765-4821',
    nomePerfil: 'Loja da Ana · Ofertas',
    conectadoEm: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    codigo: '',
    semente: 1,
    expiraEm: null,
    tentativas: 0
  }))

  const conectado = computed(() => estado.value.status === 'conectado')

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

  async function desconectar() {
    await espera(700)
    estado.value.status = 'desconectado'
    estado.value.conectadoEm = null
  }

  return { estado, conectado, gerar, renovar, simularLeitura, cancelar, desconectar }
}
