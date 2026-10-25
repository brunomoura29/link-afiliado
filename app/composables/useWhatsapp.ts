// Conexão do WhatsApp do cliente (UazAPI, sempre pelo servidor — o token não vem ao navegador).
// Status: GET /api/whatsapp/status. Conectar: POST /api/whatsapp/conectar (QR ou código pelo
// número) e depois acompanha o status até parear. Desconectar: aguardando a doc da UazAPI.

export type StatusWhatsapp = 'desconectado' | 'gerando' | 'aguardando' | 'conectado'
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
  codigo: string // código de pareamento, ex.: "ABCD-1234"
  qrcode: string | null // imagem base64 vinda da UazAPI
  expiraEm: number | null // limite para concluir o pareamento
}

const PRAZO_MS = 3 * 60_000 // tempo para ler o QR / digitar o código
const INTERVALO_MS = 3_000 // de quanto em quanto tempo confere o status

// "ABCD1234" → "ABCD-1234"
const formatarCodigo = (c: string) => (c.includes('-') || c.length !== 8 ? c : `${c.slice(0, 4)}-${c.slice(4)}`)

let acompanhamento: ReturnType<typeof setInterval> | undefined

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
    qrcode: null,
    expiraEm: null
  }))

  const conectado = computed(() => estado.value.status === 'conectado')
  const emConexao = () => ['gerando', 'aguardando'].includes(estado.value.status)

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
        if (!emConexao()) e.status = 'desconectado'
        return true
      }
      if (r.status === 'conectado') {
        e.status = 'conectado'
        e.numero = formatarNumeroWhatsapp(r.numero)
        e.nomePerfil = r.nomePerfil ?? ''
        e.foto = r.foto ?? null
        e.conectadoEm = r.conectadoEm ?? null
        e.expiraEm = null
        pararAcompanhamento()
        return true
      }
      if (emConexao()) {
        // QR do WhatsApp troca a cada poucos segundos; o código também pode ser renovado
        if (r.qrcode) e.qrcode = r.qrcode
        if (r.paircode) e.codigo = formatarCodigo(r.paircode)
        return true
      }
      e.status = 'desconectado'
      e.motivoDesconexao = r.motivoDesconexao ?? null
    } catch {
      e.carregado = true
      if (!emConexao()) e.erro = 'Não foi possível consultar o WhatsApp agora.'
    }
    return true
  }

  function pararAcompanhamento() {
    clearInterval(acompanhamento)
    acompanhamento = undefined
  }

  function acompanhar() {
    pararAcompanhamento()
    acompanhamento = setInterval(async () => {
      const e = estado.value
      if (e.expiraEm && Date.now() > e.expiraEm) {
        cancelar()
        toast.erro('O tempo para conectar acabou', 'Gere um novo código quando estiver com o celular em mãos.')
        return
      }
      await carregarStatus()
    }, INTERVALO_MS)
  }

  // Pede o QR code ou o código pelo número (telefone com DDD, ex.: "(85) 99438-7766")
  async function gerar(modo: ModoConexao, telefone?: string): Promise<{ ok: boolean, mensagem?: string }> {
    const e = estado.value
    e.modo = modo
    e.status = 'gerando'
    e.codigo = ''
    e.qrcode = null
    e.erro = null
    try {
      const r = await $fetch('/api/whatsapp/conectar', { method: 'POST', body: { modo, telefone } })
      if (r.status === 'conectado') {
        await carregarStatus()
        return { ok: true }
      }
      e.qrcode = r.qrcode
      e.codigo = r.paircode ? formatarCodigo(r.paircode) : ''
      e.status = 'aguardando'
      e.semInstancia = false
      e.expiraEm = Date.now() + PRAZO_MS
      acompanhar()
      return { ok: true }
    } catch (err) {
      e.status = 'desconectado'
      const { statusMessage, data } = err as { statusMessage?: string, data?: { message?: string } }
      const mensagem = statusMessage === 'telefone_invalido' ? 'Número inválido: informe o celular com DDD.'
        : data?.message ?? 'Não foi possível iniciar a conexão. Tente de novo.'
      e.erro = mensagem
      return { ok: false, mensagem }
    }
  }

  // Para de acompanhar na tela (a tentativa na UazAPI expira sozinha)
  function cancelar() {
    pararAcompanhamento()
    estado.value.status = 'desconectado'
    estado.value.expiraEm = null
    estado.value.qrcode = null
    estado.value.codigo = ''
  }

  // TODO: doc de desconectar da UazAPI. false = não feito (já avisou)
  async function desconectar() {
    toast.info('Disponível em breve', 'Desconectar pelo app entra junto com a próxima parte da UazAPI.')
    return false
  }

  return { estado, conectado, carregarStatus, gerar, cancelar, desconectar, pararAcompanhamento }
}
