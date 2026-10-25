-- Fotos de grupo trocadas pelo app. A UazAPI não devolve a URL da foto nova e a listagem
-- fica velha, então a foto enviada é guardada aqui e vira o foto_url do grupo.
-- Público para leitura (a foto do grupo já é vista por quem tem o convite); só o servidor
-- (service role) grava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-grupos', 'fotos-grupos', true, 524288, array['image/jpeg']);
