-- Dados extras dos grupos vindos da UazAPI (GET /group/list).
alter table public.whatsapp_destinos
  add column foto_url text,
  add column pode_enviar boolean not null default true, -- OwnerCanSendMessage
  add column so_admins boolean not null default false, -- IsAnnounce: só admins mandam mensagem
  add column sincronizado_em timestamptz;
