-- Descrição do grupo no WhatsApp. A listagem da UazAPI só preenche na primeira vez;
-- depois vale o que foi mudado pelo app (a listagem fica velha depois de uma mudança).
alter table public.whatsapp_destinos add column descricao text not null default '';
