// Junta o que a listagem da UazAPI diz de um grupo com o que já está em whatsapp_destinos.
// A listagem leva ~1 min para refletir uma mudança (medido: 61–70 s). Logo depois de o app
// mexer no grupo, ela ainda mostra o valor antigo: até JANELA_EDICAO_APP depois, vale o que
// o app gravou; depois, vale o WhatsApp (inclusive mudanças feitas pelo celular).
export const JANELA_EDICAO_APP = 3 * 60_000

type GrupoListado = Awaited<ReturnType<typeof listarGrupos>>[number]

interface Existente {
  nome: string
  descricao: string
  so_admins: boolean
  convite_url: string | null
  foto_url: string | null
  editado_no_app_em: string | null
}

export function dadosDaListagem(g: GrupoListado, existente?: Existente | null) {
  const recente = !!existente?.editado_no_app_em && Date.now() - new Date(existente.editado_no_app_em).getTime() < JANELA_EDICAO_APP
  // Foto trocada pelo app fica no Storage; a da listagem é a que a UazAPI guardou (pode ser velha)
  const fotoDoApp = !!existente?.foto_url?.includes('/fotos-grupos/')
  return {
    nome: recente ? existente!.nome : g.nome,
    membros: g.membros,
    admin: g.admin,
    pode_enviar: g.podeEnviar,
    so_admins: recente ? existente!.so_admins : g.soAdmins,
    descricao: recente ? existente!.descricao : g.descricao,
    // A listagem quase nunca traz o convite: mantém o que já foi buscado enquanto for admin
    convite_url: g.convite ?? (g.admin ? existente?.convite_url ?? null : null),
    foto_url: recente || fotoDoApp ? existente?.foto_url ?? null : g.foto ?? existente?.foto_url ?? null,
    sincronizado_em: new Date().toISOString()
  }
}
