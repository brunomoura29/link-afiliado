-- Quando o app mudou o grupo no WhatsApp (nome, descrição, foto, "só admins"). A listagem da
-- UazAPI leva ~1 min para refletir uma mudança; até 3 min depois disso, vale o que o app gravou.
alter table public.whatsapp_destinos add column editado_no_app_em timestamptz;
