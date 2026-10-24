// O tema inicial é aplicado por um script no <head> (nuxt.config.ts) antes da pintura.
export function useTema() {
  const escuro = useState('tema-escuro', () => false)

  onMounted(() => {
    escuro.value = document.documentElement.classList.contains('dark')
  })

  function alternar() {
    escuro.value = !escuro.value
    document.documentElement.classList.toggle('dark', escuro.value)
    try {
      localStorage.setItem('tema', escuro.value ? 'escuro' : 'claro')
    } catch {}
  }

  return { escuro, alternar }
}
