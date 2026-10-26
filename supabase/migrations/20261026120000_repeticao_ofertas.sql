-- Repetição automática das ofertas. A categoria tem o padrão (desligado = null), que a
-- oferta nova herda; cada oferta pode mudar o seu. Em cada repetição o produto é lido de
-- novo; se sumir, esgotar ou o preço subir, a repetição pausa (repeticao_pausada = motivo).
alter table public.categorias
  add column repetir_a_cada_dias int check (repetir_a_cada_dias in (2, 3, 7, 15, 30)),
  add column repetir_max int not null default 3 check (repetir_max between 1 and 10);

alter table public.ofertas
  add column repetir_a_cada_dias int check (repetir_a_cada_dias in (2, 3, 7, 15, 30)),
  add column repetir_max int not null default 3 check (repetir_max between 1 and 10),
  add column repeticoes_feitas int not null default 0, -- sem contar o 1º envio
  add column proxima_repeticao_em timestamptz,
  add column repeticao_pausada text,
  add column preco_enviado numeric(12, 2); -- preço da última rodada (para saber se subiu)
create index ofertas_repeticao on public.ofertas (proxima_repeticao_em) where proxima_repeticao_em is not null;

-- Rodada do envio: 1 = 1º envio, 2 = 1ª repetição... "não mandar 2x no mesmo grupo" vale por rodada
alter table public.envios add column rodada int not null default 1;

-- Oferta nova herda o padrão da categoria
create function public.ofertas_herdar_repeticao() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.repetir_a_cada_dias is null and new.categoria_id is not null then
    select c.repetir_a_cada_dias, c.repetir_max into new.repetir_a_cada_dias, new.repetir_max
    from public.categorias c where c.id = new.categoria_id;
  end if;
  return new;
end;
$$;
create trigger ofertas_herdar_repeticao before insert on public.ofertas
  for each row execute function public.ofertas_herdar_repeticao();
