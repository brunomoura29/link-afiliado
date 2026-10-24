-- Dados extras da leitura da página do produto.
-- condicao_preco: quando o preço só vale numa condição (ex.: "no Pix") — a legenda precisa dizer.
alter table public.ofertas
  add column desconto_rotulo text, -- texto da loja, ex.: "20% OFF no Pix"
  add column condicao_preco text, -- ex.: "no Pix"
  add column url_produto text, -- endereço final depois dos redirecionamentos
  add column lida_em timestamptz; -- última leitura da página
