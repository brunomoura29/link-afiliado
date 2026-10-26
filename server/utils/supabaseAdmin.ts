import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

// Cliente com a chave secreta para as tarefas agendadas (server/tasks), que não têm uma
// requisição para passar a serverSupabaseServiceRole(event). Mesmas chaves do módulo.
let cliente: SupabaseClient<Database> | null = null

export function supabaseAdmin() {
  if (cliente) return cliente
  const config = useRuntimeConfig()
  const chave = config.supabase.secretKey || config.supabase.serviceKey
  if (!chave) throw new Error('Falta a chave secreta do Supabase (NUXT_SUPABASE_SECRET_KEY).')
  cliente = createClient<Database>(config.public.supabase.url, chave, {
    auth: { detectSessionInUrl: false, persistSession: false, autoRefreshToken: false }
  })
  return cliente
}
