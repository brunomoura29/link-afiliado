// (11) 98765-4321 enquanto digita
export function formatarTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
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
