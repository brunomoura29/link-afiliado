export type ToastTipo = 'sucesso' | 'erro' | 'info' | 'whatsapp'

export interface Toast {
  id: number
  tipo: ToastTipo
  titulo: string
  descricao?: string
  duracao: number
  acao?: { rotulo: string, aoClicar: () => void }
}

type NovoToast = Omit<Toast, 'id' | 'duracao'> & { duracao?: number }

let proximoId = 0

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function mostrar(t: NovoToast) {
    const id = ++proximoId
    toasts.value.unshift({ duracao: 4500, ...t, id })
    if (toasts.value.length > 4) toasts.value.pop()
    return id
  }

  function fechar(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    fechar,
    mostrar,
    sucesso: (titulo: string, descricao?: string) => mostrar({ tipo: 'sucesso', titulo, descricao }),
    erro: (titulo: string, descricao?: string) => mostrar({ tipo: 'erro', titulo, descricao }),
    info: (titulo: string, descricao?: string) => mostrar({ tipo: 'info', titulo, descricao }),
    whatsapp: (titulo: string, descricao?: string) => mostrar({ tipo: 'whatsapp', titulo, descricao })
  }
}
