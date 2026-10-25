-- Fila de envio para os grupos (processada a cada minuto).
-- "enviando": o envio foi pego por um processamento (evita mandar duas vezes a mesma mensagem).
alter table public.envios drop constraint envios_status_check;
alter table public.envios add constraint envios_status_check check (status in ('na_fila', 'enviando', 'enviado', 'erro'));
alter table public.envios add column mensagem_id text; -- id da mensagem no WhatsApp
alter table public.envios add column tentativas int not null default 0;
alter table public.envios add column pego_em timestamptz; -- quando passou para "enviando"
create index envios_destino_enviado on public.envios (destino_id, enviado_em) where status = 'enviado';

-- Próximo envio liberado para o número (intervalo aleatório entre envios, em configuracoes)
alter table public.whatsapp_conexoes add column proximo_envio_em timestamptz;
