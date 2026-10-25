// Gerado a partir do banco (Supabase › generate types). Não editar à mão:
// depois de cada migração, gerar de novo.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativa: boolean
          atualizado_em: string
          auto_criar: boolean
          criado_em: string
          descricao: string
          emoji: string
          id: string
          nome: string
          owner_id: string
          padrao_nome: string
          palavra_chave: string | null
          slug: string
          so_admins: boolean
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          auto_criar?: boolean
          criado_em?: string
          descricao?: string
          emoji?: string
          id?: string
          nome: string
          owner_id?: string
          padrao_nome?: string
          palavra_chave?: string | null
          slug: string
          so_admins?: boolean
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          auto_criar?: boolean
          criado_em?: string
          descricao?: string
          emoji?: string
          id?: string
          nome?: string
          owner_id?: string
          padrao_nome?: string
          palavra_chave?: string | null
          slug?: string
          so_admins?: boolean
        }
        Relationships: []
      }
      cliques_entrada: {
        Row: {
          categoria_id: string | null
          criado_em: string
          destino_id: string | null
          dispositivo: string | null
          id: number
          origem: string
          owner_id: string
          referer: string | null
          visitante_hash: string | null
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string
          destino_id?: string | null
          dispositivo?: string | null
          id?: never
          origem?: string
          owner_id: string
          referer?: string | null
          visitante_hash?: string | null
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string
          destino_id?: string | null
          dispositivo?: string | null
          id?: never
          origem?: string
          owner_id?: string
          referer?: string | null
          visitante_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cliques_entrada_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliques_entrada_destino_id_fkey'
            columns: ['destino_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_destinos'
            referencedColumns: ['id']
          }
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          emojis: boolean
          fim: string
          inicio: string
          intervalo_max: number
          intervalo_min: number
          limite_diario: number
          owner_id: string
          pausa_noturna: boolean
          rodape: string
          tom: string
        }
        Insert: {
          atualizado_em?: string
          emojis?: boolean
          fim?: string
          inicio?: string
          intervalo_max?: number
          intervalo_min?: number
          limite_diario?: number
          owner_id: string
          pausa_noturna?: boolean
          rodape?: string
          tom?: string
        }
        Update: {
          atualizado_em?: string
          emojis?: boolean
          fim?: string
          inicio?: string
          intervalo_max?: number
          intervalo_min?: number
          limite_diario?: number
          owner_id?: string
          pausa_noturna?: boolean
          rodape?: string
          tom?: string
        }
        Relationships: []
      }
      envios: {
        Row: {
          agendado_para: string | null
          criado_em: string
          destino_id: string | null
          enviado_em: string | null
          erro: string | null
          grupo_nome: string
          id: string
          oferta_id: string
          owner_id: string
          status: string
        }
        Insert: {
          agendado_para?: string | null
          criado_em?: string
          destino_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          grupo_nome?: string
          id?: string
          oferta_id: string
          owner_id: string
          status?: string
        }
        Update: {
          agendado_para?: string | null
          criado_em?: string
          destino_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          grupo_nome?: string
          id?: string
          oferta_id?: string
          owner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'envios_destino_id_fkey'
            columns: ['destino_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_destinos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envios_oferta_id_fkey'
            columns: ['oferta_id']
            isOneToOne: false
            referencedRelation: 'ofertas'
            referencedColumns: ['id']
          }
        ]
      }
      leads: {
        Row: {
          categoria_id: string | null
          criado_em: string
          entrou: boolean
          entrou_em: string | null
          id: string
          nome: string
          numero: string
          owner_id: string
          palavra_chave: string
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string
          entrou?: boolean
          entrou_em?: string | null
          id?: string
          nome?: string
          numero: string
          owner_id: string
          palavra_chave?: string
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string
          entrou?: boolean
          entrou_em?: string | null
          id?: string
          nome?: string
          numero?: string
          owner_id?: string
          palavra_chave?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          }
        ]
      }
      links_formulario: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          owner_id: string
          token: string
          ultimo_uso: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          owner_id?: string
          token?: string
          ultimo_uso?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          owner_id?: string
          token?: string
          ultimo_uso?: string | null
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          atualizado_em: string
          categoria_id: string | null
          condicao_preco: string | null
          criado_em: string
          desconto_rotulo: string | null
          id: string
          imagem_url: string | null
          item_id: string | null
          legenda: string | null
          lida_em: string | null
          link_afiliado: string
          link_formulario_id: string | null
          motivo: string | null
          origem_nome: string
          owner_id: string
          plataforma: string
          preco: number | null
          preco_original: number | null
          status: string
          titulo: string | null
          url_produto: string | null
        }
        Insert: {
          atualizado_em?: string
          categoria_id?: string | null
          condicao_preco?: string | null
          criado_em?: string
          desconto_rotulo?: string | null
          id?: string
          imagem_url?: string | null
          item_id?: string | null
          legenda?: string | null
          lida_em?: string | null
          link_afiliado: string
          link_formulario_id?: string | null
          motivo?: string | null
          origem_nome?: string
          owner_id?: string
          plataforma: string
          preco?: number | null
          preco_original?: number | null
          status?: string
          titulo?: string | null
          url_produto?: string | null
        }
        Update: {
          atualizado_em?: string
          categoria_id?: string | null
          condicao_preco?: string | null
          criado_em?: string
          desconto_rotulo?: string | null
          id?: string
          imagem_url?: string | null
          item_id?: string | null
          legenda?: string | null
          lida_em?: string | null
          link_afiliado?: string
          link_formulario_id?: string | null
          motivo?: string | null
          origem_nome?: string
          owner_id?: string
          plataforma?: string
          preco?: number | null
          preco_original?: number | null
          status?: string
          titulo?: string | null
          url_produto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ofertas_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ofertas_link_formulario_id_fkey'
            columns: ['link_formulario_id']
            isOneToOne: false
            referencedRelation: 'links_formulario'
            referencedColumns: ['id']
          }
        ]
      }
      perfis: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      whatsapp_conexoes: {
        Row: {
          atualizado_em: string
          conectado_em: string | null
          nome_perfil: string | null
          numero: string | null
          owner_id: string
          status: string
        }
        Insert: {
          atualizado_em?: string
          conectado_em?: string | null
          nome_perfil?: string | null
          numero?: string | null
          owner_id: string
          status?: string
        }
        Update: {
          atualizado_em?: string
          conectado_em?: string | null
          nome_perfil?: string | null
          numero?: string | null
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      whatsapp_credenciais: {
        Row: {
          criado_em: string
          instancia: string
          instancia_id: string | null
          owner_id: string
          token: string
        }
        Insert: {
          criado_em?: string
          instancia: string
          instancia_id?: string | null
          owner_id: string
          token: string
        }
        Update: {
          criado_em?: string
          instancia?: string
          instancia_id?: string | null
          owner_id?: string
          token?: string
        }
        Relationships: []
      }
      whatsapp_destinos: {
        Row: {
          admin: boolean
          atualizado_em: string
          capacidade: number
          categoria_id: string | null
          convite_url: string | null
          id: string
          jid: string
          membros: number
          nome: string
          ordem: number
          owner_id: string
          recebe_ofertas: boolean
          tipo: string
        }
        Insert: {
          admin?: boolean
          atualizado_em?: string
          capacidade?: number
          categoria_id?: string | null
          convite_url?: string | null
          id?: string
          jid: string
          membros?: number
          nome?: string
          ordem?: number
          owner_id?: string
          recebe_ofertas?: boolean
          tipo?: string
        }
        Update: {
          admin?: boolean
          atualizado_em?: string
          capacidade?: number
          categoria_id?: string | null
          convite_url?: string | null
          id?: string
          jid?: string
          membros?: number
          nome?: string
          ordem?: number
          owner_id?: string
          recebe_ofertas?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_destinos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_token: { Args: { tamanho?: number }, Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type Publico = Database['public']['Tables']
export type Tables<T extends keyof Publico> = Publico[T]['Row']
export type TablesInsert<T extends keyof Publico> = Publico[T]['Insert']
export type TablesUpdate<T extends keyof Publico> = Publico[T]['Update']
