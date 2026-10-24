import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Busca o link do formulário pelo token. Inativo ou inexistente → 404 (mesma resposta,
// para não revelar quais tokens existem).
export async function linkPorToken(event: H3Event, token: string) {
  if (!/^[A-Za-z0-9]{8,32}$/.test(token)) throw createError({ statusCode: 404, statusMessage: 'link_invalido' })
  const admin = serverSupabaseServiceRole(event)
  const { data } = await admin
    .from('links_formulario')
    .select('id, owner_id, nome, ativo')
    .eq('token', token)
    .maybeSingle()
  if (!data?.ativo) throw createError({ statusCode: 404, statusMessage: 'link_invalido' })
  return data
}

// Limite simples de envios por link (em memória, por instância do servidor).
// Suficiente contra abuso básico; trocar por algo compartilhado se rodar em várias instâncias.
const JANELA_MS = 60_000
const MAXIMO_POR_JANELA = 20
const envios = new Map<string, number[]>()

export function dentroDoLimite(chave: string) {
  const agora = Date.now()
  const recentes = (envios.get(chave) ?? []).filter(t => agora - t < JANELA_MS)
  if (recentes.length >= MAXIMO_POR_JANELA) {
    envios.set(chave, recentes)
    return false
  }
  recentes.push(agora)
  envios.set(chave, recentes)
  return true
}
