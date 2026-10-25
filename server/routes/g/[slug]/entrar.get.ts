import { createHash } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

// Botão "Entrar no grupo": registra o clique (só quantidade, sem identificar ninguém) e
// manda para o convite do grupo que está recebendo membros. É um link comum (/g/<slug>/entrar),
// então funciona até sem JavaScript.
const ORIGENS = new Set(['instagram', 'tiktok', 'bio', 'whatsapp', 'facebook', 'youtube', 'kwai', 'twitter', 'telegram', 'direto'])
const JANELA_DEDUP_MS = 30 * 60_000 // mesmo visitante na mesma categoria conta 1x a cada 30 min

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  let cat
  try {
    cat = await categoriaPorSlug(event, slug)
  } catch {
    return sendRedirect(event, `/g/${encodeURIComponent(slug)}`, 302)
  }
  const { ativo } = await gruposDaCategoria(event, cat.owner_id, cat.id)

  const src = String(getQuery(event).src ?? '').toLowerCase().trim()
  const origem = ORIGENS.has(src) ? src : (src ? 'outra' : 'direto')
  const ua = getHeader(event, 'user-agent') ?? ''
  const dispositivo = /mobile|android|iphone|ipad/i.test(ua) ? 'celular' : 'computador'
  const referer = (getHeader(event, 'referer') ?? '').slice(0, 300) || null

  // Marca anônima do dia: não guarda IP, só um resumo que não volta a ser IP
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''
  const dia = new Date().toISOString().slice(0, 10)
  const visitante = createHash('sha256').update(`${ip}|${ua}|${dia}|${cat.id}`).digest('hex').slice(0, 32)

  const admin = serverSupabaseServiceRole(event)
  const { count } = await admin
    .from('cliques_entrada')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', cat.id)
    .eq('visitante_hash', visitante)
    .gte('criado_em', new Date(Date.now() - JANELA_DEDUP_MS).toISOString())
  if (!count) {
    await admin.from('cliques_entrada').insert({
      owner_id: cat.owner_id,
      categoria_id: cat.id,
      destino_id: ativo?.id ?? null,
      origem,
      referer,
      dispositivo,
      visitante_hash: visitante
    })
  }

  // Só redireciona para convite do WhatsApp (o convite fica no banco e o cliente pode
  // editar os grupos dele: sem essa trava, o nosso domínio viraria redirecionador aberto).
  // Sem grupo com vaga: volta para a página, que mostra "lotado" / "em breve".
  const convite = ativo?.convite_url
  const seguro = convite && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(convite)
  return sendRedirect(event, seguro ? convite : `/g/${encodeURIComponent(slug)}`, 302)
})
