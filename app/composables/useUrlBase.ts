// Endereço público do app para montar links (/f/..., /g/...).
// Em produção vem de NUXT_PUBLIC_URL_BASE; sem ela, usa o endereço atual (ex.: localhost).
export function useUrlBase() {
  const configurada = useRuntimeConfig().public.urlBase as string
  return (configurada || useRequestURL().origin).replace(/\/$/, '')
}
