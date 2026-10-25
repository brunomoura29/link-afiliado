import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Detalhes do grupo: muda nome, descrição e/ou foto no WhatsApp (só o que vier no corpo)
// e grava em whatsapp_destinos. Altera o grupo de verdade. Exige o número como admin.
// A foto chega já em JPEG 640x640 (o navegador recorta) como data URL, ou "remove". A UazAPI
// não devolve a URL da foto nova, então ela é guardada no Storage (fotos-grupos/<dono>/<grupo>.jpg).
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/
const LIMITE_FOTO = 400_000 // caracteres do data URL (~300 KB)

// Devolve a URL pública (com versão, para o navegador não mostrar a antiga do cache).
// Se o Storage falhar, a foto já está no WhatsApp: segue sem URL (a tela mostra a enviada).
async function guardarFoto(admin: ReturnType<typeof serverSupabaseServiceRole>, caminho: string, dataUrl: string) {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
  const { error } = await admin.storage.from('fotos-grupos').upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) return null
  return `${admin.storage.from('fotos-grupos').getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`
}

export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const corpo = await readBody<{ nome?: string, descricao?: string, imagem?: string }>(event)
  const nome = corpo?.nome?.trim()
  const descricao = corpo?.descricao?.trim()
  const imagem = corpo?.imagem
  if (nome !== undefined && (nome.length < 1 || nome.length > 25)) throw createError({ statusCode: 400, statusMessage: 'nome_invalido', message: 'O nome precisa ter de 1 a 25 letras.' })
  if (descricao !== undefined && descricao.length > 512) throw createError({ statusCode: 400, statusMessage: 'descricao_invalida', message: 'A descrição pode ter até 512 letras.' })
  if (imagem !== undefined && imagem !== 'remove' && (!JPEG.test(imagem) || imagem.length > LIMITE_FOTO)) throw createError({ statusCode: 400, statusMessage: 'imagem_invalida', message: 'A foto precisa ser JPEG de até 640x640.' })
  if (nome === undefined && descricao === undefined && imagem === undefined) throw createError({ statusCode: 400, statusMessage: 'nada_para_mudar' })

  const admin = serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')!
  const { data: grupo } = await admin.from('whatsapp_destinos').select('jid, admin').eq('id', id).eq('owner_id', usuario.sub).eq('tipo', 'grupo').maybeSingle()
  if (!grupo) throw createError({ statusCode: 404, statusMessage: 'nao_encontrado' })
  if (!grupo.admin) throw createError({ statusCode: 409, statusMessage: 'nao_admin', message: 'O número conectado não é admin deste grupo.' })

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de mudar o grupo.' })

  // Um de cada vez: se um falhar, o que já mudou fica gravado e o erro diz o que faltou
  const mudou: { nome?: string, descricao?: string, foto_url?: string | null } = {}
  try {
    if (nome !== undefined) {
      await renomearGrupo(cred.token, grupo.jid, nome)
      mudou.nome = nome
    }
    if (descricao !== undefined) {
      await definirDescricao(cred.token, grupo.jid, descricao)
      mudou.descricao = descricao
    }
    if (imagem !== undefined) {
      await definirImagem(cred.token, grupo.jid, imagem)
      if (imagem === 'remove') await admin.storage.from('fotos-grupos').remove([`${usuario.sub}/${id}.jpg`])
      mudou.foto_url = imagem === 'remove' ? null : await guardarFoto(admin, `${usuario.sub}/${id}.jpg`, imagem)
    }
  } catch (e) {
    if (Object.keys(mudou).length) await admin.from('whatsapp_destinos').update({ ...mudou, editado_no_app_em: new Date().toISOString() }).eq('id', id)
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Tente de novo.' : e.message, data: { mudou } })
    }
    throw e
  }

  await admin.from('whatsapp_destinos').update({ ...mudou, editado_no_app_em: new Date().toISOString() }).eq('id', id)
  return mudou
})
