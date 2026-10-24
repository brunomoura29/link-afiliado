import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

// Login com telefone + senha sem SMS: acha o e-mail do perfil pelo telefone e faz
// o login com e-mail + senha no servidor (a sessão volta nos cookies).
// O e-mail nunca é devolvido ao navegador.
export default defineEventHandler(async (event) => {
  const { telefone, senha } = await readBody<{ telefone?: string, senha?: string }>(event)
  const digitos = String(telefone ?? '').replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(digitos) || !senha) {
    throw createError({ statusCode: 400, statusMessage: 'Telefone ou senha inválidos' })
  }

  const admin = serverSupabaseServiceRole(event)
  const { data: perfil } = await admin.from('perfis').select('email').eq('telefone', digitos).maybeSingle()

  // Mesma mensagem para "telefone não existe" e "senha errada" (não revela quem tem conta)
  const erroCredenciais = createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  if (!perfil?.email) throw erroCredenciais

  const supabase = await serverSupabaseClient(event)
  const { error } = await supabase.auth.signInWithPassword({ email: perfil.email, password: senha })
  if (error) throw erroCredenciais

  return { ok: true }
})
