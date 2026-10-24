-- LinkAfiliado — esquema inicial (multi-cliente).
-- Regra geral: toda tabela tem owner_id e RLS; o cliente só enxerga o que é dele.
-- Escritas de páginas públicas (formulário /f, entrada /g) e de webhooks são feitas
-- pelo servidor com a chave secreta (ignora RLS).

-- Utilitário: atualizado_em automático
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Código aleatório para links públicos (12 caracteres, sem símbolos)
create or replace function public.gerar_token(tamanho int default 12)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(tamanho);
  resultado text := '';
begin
  for i in 0 .. tamanho - 1 loop
    resultado := resultado || substr(letras, (get_byte(bytes, i) % length(letras)) + 1, 1);
  end loop;
  return resultado;
end;
$$;

-- ───────────────────────── Perfis e configurações ─────────────────────────

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  telefone text, -- só dígitos, com DDD (login por telefone)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index perfis_telefone_unico on public.perfis (telefone) where telefone is not null;

create table public.configuracoes (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  limite_diario int not null default 8 check (limite_diario between 1 and 50),
  intervalo_min int not null default 10 check (intervalo_min between 1 and 240),
  intervalo_max int not null default 25 check (intervalo_max between 1 and 240),
  pausa_noturna boolean not null default true,
  inicio time not null default '07:00',
  fim time not null default '23:00',
  tom text not null default 'animado' check (tom in ('animado', 'direto', 'profissional')),
  emojis boolean not null default true,
  rodape text not null default '',
  atualizado_em timestamptz not null default now(),
  check (intervalo_max >= intervalo_min)
);

-- Cria perfil + configurações quando alguém se cadastra
-- (nome e telefone vêm de options.data no signUp)
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), '')
  );
  insert into public.configuracoes (owner_id) values (new.id);
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- ───────────────────────── Categorias ─────────────────────────

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  emoji text not null default '🛒',
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- /g/<slug>, único no sistema todo
  palavra_chave text,
  descricao text not null default '',
  ativa boolean not null default true,
  auto_criar boolean not null default true,
  padrao_nome text not null default '',
  so_admins boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index categorias_slug_unico on public.categorias (slug);
create unique index categorias_palavra_chave_unica on public.categorias (owner_id, upper(palavra_chave)) where palavra_chave is not null;
create index categorias_owner on public.categorias (owner_id);

-- ───────────────────────── Links do formulário ─────────────────────────

create table public.links_formulario (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  token text not null unique default public.gerar_token(),
  ativo boolean not null default true,
  ultimo_uso timestamptz,
  criado_em timestamptz not null default now()
);
create index links_formulario_owner on public.links_formulario (owner_id);

-- ───────────────────────── WhatsApp ─────────────────────────

create table public.whatsapp_conexoes (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'desconectado' check (status in ('desconectado', 'aguardando', 'conectado')),
  numero text,
  nome_perfil text,
  conectado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

-- Credenciais da instância na UazAPI: só o servidor lê (RLS sem políticas)
create table public.whatsapp_credenciais (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  instancia text not null,
  token text not null,
  criado_em timestamptz not null default now()
);

create table public.whatsapp_destinos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jid text not null, -- id do grupo/contato no WhatsApp
  nome text not null default '',
  tipo text not null default 'grupo' check (tipo in ('grupo', 'contato')),
  categoria_id uuid references public.categorias (id) on delete set null,
  ordem int not null default 0, -- ordem na rotação do link de entrada
  recebe_ofertas boolean not null default false,
  membros int not null default 0,
  capacidade int not null default 1024,
  admin boolean not null default false,
  convite_url text,
  atualizado_em timestamptz not null default now(),
  unique (owner_id, jid)
);
create index whatsapp_destinos_categoria on public.whatsapp_destinos (owner_id, categoria_id, ordem);
create index whatsapp_destinos_categoria_fk on public.whatsapp_destinos (categoria_id);

-- ───────────────────────── Ofertas e envios ─────────────────────────

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete set null,
  link_formulario_id uuid references public.links_formulario (id) on delete set null,
  origem_nome text not null default 'Você', -- nome do link (ou "Você") no momento do envio
  link_afiliado text not null,
  plataforma text not null, -- shopee | mercado_livre | amazon | tiktok | magalu | aliexpress | shein | outra
  item_id text,
  titulo text,
  preco numeric(12, 2),
  preco_original numeric(12, 2),
  imagem_url text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada', 'enviada')),
  motivo text, -- por que foi rejeitada (painel mostra "tentar de novo")
  legenda text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (owner_id, link_afiliado)
);
create index ofertas_owner_data on public.ofertas (owner_id, criado_em desc);
create index ofertas_status on public.ofertas (status) where status in ('pendente', 'aprovada');
create index ofertas_categoria_fk on public.ofertas (categoria_id);
create index ofertas_link_formulario_fk on public.ofertas (link_formulario_id);

create table public.envios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  oferta_id uuid not null references public.ofertas (id) on delete cascade,
  destino_id uuid references public.whatsapp_destinos (id) on delete set null,
  grupo_nome text not null default '',
  status text not null default 'na_fila' check (status in ('na_fila', 'enviado', 'erro')),
  erro text,
  agendado_para timestamptz,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index envios_oferta on public.envios (oferta_id);
create index envios_destino_fk on public.envios (destino_id);
create index envios_fila on public.envios (agendado_para) where status = 'na_fila';
create index envios_owner on public.envios (owner_id);

-- ───────────────────────── Captação de membros ─────────────────────────

-- Só quantidade: nada que identifique a pessoa (visitante_hash é anônimo, para não contar 2x)
create table public.cliques_entrada (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete cascade,
  destino_id uuid references public.whatsapp_destinos (id) on delete set null,
  origem text not null default 'direto',
  referer text,
  dispositivo text,
  visitante_hash text,
  criado_em timestamptz not null default now()
);
create index cliques_entrada_owner_data on public.cliques_entrada (owner_id, criado_em desc);
create index cliques_entrada_categoria_fk on public.cliques_entrada (categoria_id);
create index cliques_entrada_destino_fk on public.cliques_entrada (destino_id);

-- Quem pediu o convite pela palavra-chave (número + nome de perfil do WhatsApp)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  numero text not null,
  nome text not null default '',
  palavra_chave text not null default '',
  categoria_id uuid references public.categorias (id) on delete set null,
  entrou boolean not null default false,
  entrou_em timestamptz,
  criado_em timestamptz not null default now()
);
create index leads_owner_data on public.leads (owner_id, criado_em desc);
create index leads_numero on public.leads (owner_id, numero);
create index leads_categoria_fk on public.leads (categoria_id);

-- ───────────────────────── atualizado_em ─────────────────────────

create trigger tocar before update on public.perfis for each row execute function public.tocar_atualizado_em();
create trigger tocar before update on public.configuracoes for each row execute function public.tocar_atualizado_em();
create trigger tocar before update on public.categorias for each row execute function public.tocar_atualizado_em();
create trigger tocar before update on public.whatsapp_conexoes for each row execute function public.tocar_atualizado_em();
create trigger tocar before update on public.whatsapp_destinos for each row execute function public.tocar_atualizado_em();
create trigger tocar before update on public.ofertas for each row execute function public.tocar_atualizado_em();

-- ───────────────────────── RLS ─────────────────────────

alter table public.perfis enable row level security;
alter table public.configuracoes enable row level security;
alter table public.categorias enable row level security;
alter table public.links_formulario enable row level security;
alter table public.whatsapp_conexoes enable row level security;
alter table public.whatsapp_credenciais enable row level security;
alter table public.whatsapp_destinos enable row level security;
alter table public.ofertas enable row level security;
alter table public.envios enable row level security;
alter table public.cliques_entrada enable row level security;
alter table public.leads enable row level security;

-- Perfil e configurações: ler e editar só o próprio (criados pelo gatilho)
create policy "dono lê perfil" on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy "dono edita perfil" on public.perfis for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "dono lê configurações" on public.configuracoes for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono edita configurações" on public.configuracoes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- CRUD completo do dono
create policy "dono gerencia categorias" on public.categorias for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono gerencia links" on public.links_formulario for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono gerencia destinos" on public.whatsapp_destinos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono gerencia ofertas" on public.ofertas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Só leitura (quem escreve é o servidor: status da conexão, fila, cliques, webhooks)
create policy "dono lê conexão" on public.whatsapp_conexoes for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono lê envios" on public.envios for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono lê cliques" on public.cliques_entrada for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono lê leads" on public.leads for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono apaga leads" on public.leads for delete to authenticated using (owner_id = (select auth.uid()));

-- whatsapp_credenciais: RLS ligado e nenhuma política = só a chave secreta acessa.

-- Funções internas não ficam expostas pela API
revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
revoke execute on function public.tocar_atualizado_em() from public, anon, authenticated;
-- gerar_token é o default de links_formulario.token: quem insere (authenticated) precisa executar
revoke execute on function public.gerar_token(int) from public, anon;
