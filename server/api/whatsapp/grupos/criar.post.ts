import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// "Novo grupo" da página da categoria: cria o grupo no WhatsApp do usuário (só com o
// próprio número, como admin), busca o convite e já coloca no fim da ordem da categoria.
// TODO (UazAPI, próxima doc): aplicar "só admins enviam mensagens" (soAdmins).
export default defineEventHandler(async (event) => {
  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) throw createError({ statusCode: 401, statusMessage: 'nao_logado' })

  const corpo = await readBody<{ categoriaId?: string, nome?: string }>(event)
  const nome = corpo?.nome?.trim() ?? ''
  if (nome.length < 2 || nome.length > 100) throw createError({ statusCode: 400, statusMessage: 'nome_invalido', message: 'O nome do grupo precisa ter de 2 a 100 letras.' })

  const admin = serverSupabaseServiceRole(event)
  const { data: categoria } = await admin.from('categorias').select('id').eq('id', corpo?.categoriaId ?? '').eq('owner_id', usuario.sub).maybeSingle()
  if (!categoria) throw createError({ statusCode: 404, statusMessage: 'categoria_nao_encontrada' })

  const { data: cred } = await admin.from('whatsapp_credenciais').select('token').eq('owner_id', usuario.sub).maybeSingle()
  if (!cred) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'Conecte o WhatsApp antes de criar grupos.' })

  let grupo
  try {
    const status = await statusInstancia(cred.token)
    if (!status.conectado) throw createError({ statusCode: 409, statusMessage: 'sem_whatsapp', message: 'O WhatsApp está desconectado. Conecte para criar grupos.' })
    grupo = await criarGrupoWhatsapp(cred.token, nome)
  } catch (e) {
    if (e instanceof ErroUazapi) {
      throw createError({ statusCode: 502, statusMessage: 'uazapi', message: e.status === 408 ? 'O WhatsApp demorou para responder. Confira no celular se o grupo foi criado antes de tentar de novo.' : e.message })
    }
    throw e
  }

  // O grupo já existe no WhatsApp: daqui em diante nada pode falhar a criação.
  // Sem convite agora, ele é buscado de novo no próximo "Atualizar".
  const convite = grupo.convite ?? await obterConvite(cred.token, grupo.jid).catch(() => null)

  const { data: ultimo } = await admin.from('whatsapp_destinos').select('ordem').eq('owner_id', usuario.sub).eq('categoria_id', categoria.id).order('ordem', { ascending: false }).limit(1).maybeSingle()
  const { data: linha, error } = await admin.from('whatsapp_destinos').upsert({
    owner_id: usuario.sub,
    jid: grupo.jid,
    tipo: 'grupo',
    nome: grupo.nome,
    membros: grupo.membros,
    admin: true,
    pode_enviar: true,
    so_admins: false,
    convite_url: convite,
    categoria_id: categoria.id,
    ordem: (ultimo?.ordem ?? 0) + 1,
    recebe_ofertas: true,
    sincronizado_em: new Date().toISOString()
  }, { onConflict: 'owner_id,jid' }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: 'erro_ao_salvar', message: 'O grupo foi criado no WhatsApp, mas não foi salvo aqui. Toque em "Atualizar" na tela de Grupos e coloque ele na categoria.' })

  return linha
})
