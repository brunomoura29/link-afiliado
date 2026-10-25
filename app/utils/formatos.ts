// (11) 98765-4321 enquanto digita
export function formatarTelefone(valor: string) {
  let d = valor.replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2) // colado com +55
  d = d.slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const ehEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// DDD + número (10 ou 11 dígitos)
export const ehTelefone = (v: string) => /^\d{10,11}$/.test(v.replace(/\D/g, ''))

// 0 a 4
export function forcaSenha(senha: string) {
  let pontos = 0
  if (senha.length >= 8) pontos++
  if (/\d/.test(senha)) pontos++
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha) || senha.length >= 12) pontos++
  return senha ? Math.max(pontos, 1) : 0
}

const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '')

// "Casa e Cozinha" → "casa-e-cozinha" (endereço do link /g/...)
export const gerarSlug = (t: string) =>
  semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

// "Casa e Cozinha" → "QUERO CASA" (palavra-chave para pedir o convite)
// Endereço do link enquanto digita: só minúsculas, números e hífen
export const limparSlug = (t: string) => semAcento(t).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 40)

// Login: se parece telefone, formata; se tem letra ou @, deixa como está (e-mail)
export const formatarEmailOuTelefone = (v: string) => /^[\d()\s+-]+$/.test(v) ? formatarTelefone(v) : v

export const gerarPalavraChave = (t: string) => {
  const primeira = semAcento(t).toUpperCase().match(/[A-Z0-9]{3,}/)?.[0]
  return primeira ? `QUERO ${primeira}` : ''
}

// "agora", "há 5 min", "há 2 h", "há 3 dias"
export function tempoRelativo(iso: string | null) {
  if (!iso) return 'nunca'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

// Número do WhatsApp (só dígitos, com DDI) → "+55 (85) 9438-7766"
export function formatarNumeroWhatsapp(digitos: string | null | undefined) {
  const d = (digitos ?? '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return `+55 ${formatarTelefone(d.slice(2))}`
  return `+${d}`
}
