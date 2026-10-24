import { serverSupabaseServiceRole } from '#supabase/server'

// Painel: lê o produto de novo (cadastro pelo painel e "Tentar de novo").
export default defineEventHandler(async (event) => {
  const oferta = await exigirDonoDaOferta(event)
  await serverSupabaseServiceRole(event).from('ofertas').update({ status: 'pendente', motivo: null }).eq('id', oferta.id)
  processarEmSegundoPlano(event, oferta.id)
  return { ok: true }
})
