-- Categoria "geral": os grupos dela recebem as ofertas de todas as categorias.
-- (Cada grupo continua em uma categoria só.)
alter table public.categorias add column recebe_todas boolean not null default false;
