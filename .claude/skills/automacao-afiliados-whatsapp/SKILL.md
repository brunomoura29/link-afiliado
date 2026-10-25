---
name: automacao-afiliados-whatsapp
description: Use this skill when building, extending or debugging the multi-store affiliate automation (any affiliate program: Shopee, Mercado Livre, Amazon, TikTok Shop, Magalu, AliExpress, Shein or any other store) — a Supabase-based pipeline that takes a manually-generated affiliate link pasted into a form, enriches product data by reading the product's public page (no affiliate API), writes a caption with AI, and sends it to WhatsApp groups. Trigger on requests to build the form, the enrichment scraper, the caption generator, the WhatsApp sender, the Supabase schema, the sending queue/cron, or group growth (invite links, /g/ entry pages, automatic group rotation, keyword opt-in) for this project.
---

# Automação de Afiliados — qualquer loja (Shopee, Mercado Livre, Amazon, TikTok Shop…)

## Visão geral

Pipeline semiautomático: o humano gera o link de afiliado manualmente, dentro do
app ou painel oficial de afiliados da loja — isso nunca é automatizado. A partir daí
o sistema assume: formulário captura o link, enriquecimento lê a página pública
do produto, IA escreve a legenda, e o envio publica no grupo de WhatsApp certo.

## Decisões já tomadas (não reabrir sem motivo novo)

- **Qualquer programa de afiliados é aceito** (Shopee, Mercado Livre,
  Amazon, TikTok Shop, Magalu, AliExpress, Shein e qualquer outra loja).
  Lojas conhecidas são detectadas pelo domínio (`app/utils/plataforma.ts`,
  fonte única da lista) e ganham nome/cor; qualquer outro link `http(s)`
  válido entra como `plataforma = 'outra'`.
- **Nenhuma API de afiliados.** O enriquecimento lê a página pública do
  produto — sem login, sem cookie, sem credencial — com leitor genérico
  (JSON-LD/Open Graph) e leitores específicos só para as lojas conhecidas.
- **Nenhuma automação gera o link de afiliado.** Isso é sempre manual, feito
  pelo humano no app oficial. A automação só começa depois que o link existe.
- Captura via **formulário** (categoria + link colado), não busca automática
  por categoria.
- Legenda gerada por **IA**, mas preço/desconto sempre vêm do dado extraído da
  página do produto — a IA nunca inventa ou decide esses valores.
- **Multi-cliente (SaaS).** Cada usuário tem sua conta e seus próprios dados
  (categorias, ofertas, postagens, envios, config, conexão de WhatsApp).
  Isolamento por `owner_id` + RLS em todas as tabelas.
- **Formulário público por token.** O dono (logado) gera um link
  `/f/<token>` e envia ao assistente, que usa sem login. O token é longo e
  aleatório, revogável/regenerável no painel. O formulário nunca escreve
  direto no banco: chama uma função server-side que valida o token e grava
  com o `owner_id` do dono. Rate limit por token.
- Envio pela **UazAPI** (API não oficial de WhatsApp, hospedada). Cada
  cliente conecta o próprio número via QR code (uma instância por cliente).
  Recomendar no painel um número dedicado, nunca o principal do negócio.
  Destino inicial: **grupos**; contatos individuais só depois, com limite
  baixo (risco de bloqueio muito maior).
- **Documentação da UazAPI é fornecida pelo usuário sob demanda.** Antes de
  implementar cada chamada (criar instância, conexão/QR + status, listar
  grupos, enviar mensagem, webhook etc.), pedir ao usuário a doc daquele
  endpoint — não inventar rotas, payloads nem headers.
- **Celular primeiro em tudo**, inclusive o painel: a maioria dos afiliados
  não tem computador. Ver a skill `design-automacao-afiliados`.
- Token/credenciais da UazAPI ficam só no servidor (Edge Function /
  server route), nunca no navegador.
- Disparo automático após a captura; o "filtro de regras" só barra erro
  técnico (link quebrado, duplicata, limite diário) — não decide se a oferta é
  boa, porque a curadoria já foi feita pelo humano ao escolher o produto.

## Stack sugerida

Mesma stack usada nos outros projetos: **Nuxt 4 + Vue 3 + TypeScript** para o
formulário (PWA leve, salvável na tela inicial do celular) e **Supabase**
(Postgres + Edge Functions + `pg_cron`) para banco, enriquecimento, geração de
legenda e fila de envio. Ajustar se o projeto real já tiver outra decisão.

Instalado no projeto: Nuxt 4.6, `@nuxtjs/tailwindcss` 6.14 (Tailwind 3.4),
`@nuxtjs/supabase` 2.1. Projeto Supabase: **LinkAfiliados**
(`grwtrmjenmkkjuiknpdx`). O redirect de login do `@nuxtjs/supabase` protege o
painel; a rota pública `/f/**` deve ficar em `redirectOptions.exclude`.

## Modelo de dados (Supabase)

> **Fonte da verdade: `supabase/migrations/`** (aplicada no projeto
> LinkAfiliados). Tipos em `app/types/database.types.ts` — gerar de novo
> após cada migração. Diferenças em relação ao rascunho abaixo: `postagens`
> foi fundida em `ofertas` (status/motivo/legenda ficam na oferta);
> `categorias.slug` é **único no sistema todo** (é a URL pública `/g/<slug>`);
> credenciais da UazAPI ficam em `whatsapp_credenciais` (RLS sem políticas,
> só a chave secreta lê); perfil + configurações são criados por gatilho no
> cadastro (nome/telefone via `options.data` do signUp). Cadastro **sem
> confirmação de e-mail** (desligar "Confirm email" no Supabase Auth).

> O schema abaixo é a base de pipeline. Na implementação, toda tabela ganha
> `owner_id uuid not null references auth.users(id)` + RLS
> (`owner_id = auth.uid()`), a deduplicação vira `unique (owner_id,
> link_afiliado)`, e entram as tabelas:
> - `links_formulario` (owner_id, token unique, nome, ativo, criado_em) — e
>   `ofertas.link_formulario_id` para saber por qual link entrou;
> - `whatsapp_conexoes` (owner_id, instância UazAPI, status, número);
> - `whatsapp_destinos` (owner_id, conexao_id, jid, nome, tipo
>   grupo/contato) — substitui `categorias.grupos_whatsapp text[]` por uma
>   relação categoria ↔ destino.

```sql
categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupos_whatsapp text[] not null default '{}',
  ativa boolean not null default true
);

ofertas (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null, -- shopee | mercado_livre | amazon | tiktok | magalu | aliexpress | shein | outra (sem check: lista cresce)
  link_afiliado text not null,
  item_id text,
  titulo text,
  preco numeric,
  preco_original numeric,
  desconto_pct numeric,
  imagem_url text,
  categoria_id uuid references categorias(id),
  criado_em timestamptz not null default now(),
  unique (link_afiliado)
);

postagens (
  id uuid primary key default gen_random_uuid(),
  oferta_id uuid references ofertas(id),
  status text not null check (status in ('pendente', 'aprovada', 'rejeitada')) default 'pendente',
  motivo_rejeicao text,
  legenda_gerada text
);

envios (
  id uuid primary key default gen_random_uuid(),
  postagem_id uuid references postagens(id),
  grupo_destino text not null,
  enviado_em timestamptz,
  sucesso boolean,
  erro text
);

config (
  chave text primary key,
  valor text not null
);
-- chaves esperadas: limite_diario_por_grupo, intervalo_min_minutos, intervalo_max_minutos
```

Deduplicação: `ofertas.link_afiliado` é `unique` — colar o mesmo link duas
vezes não deve criar uma segunda oferta/postagem.

## Fluxo

```
Humano (gera o link no app oficial)
        │
        ▼
Formulário (seleciona categoria, cola o link, salva)
        │
        ▼
Grava em `ofertas`
        │
        ▼
Enriquecimento (lê a página pública do produto — leitor genérico + específico por loja)
        │
        ▼
Filtro de regras (link/dado ok? duplicata? limite diário?) ──► rejeitada (fim)
        │ aprovada
        ▼
Legenda com IA (usa só os dados já extraídos, nunca inventa preço/desconto)
        │
        ▼
Fila de envio (cron, intervalo aleatório, respeita limite diário)
        │
        ▼
Envio ao(s) grupo(s) de WhatsApp da categoria
```

## Passo a passo de implementação

Seguir nesta ordem; cada etapa deve funcionar sozinha antes de ligar a
próxima (ver checklist de aceite no fim).

### 1. Fundação
- Criar projeto Supabase, aplicar o schema acima como migration.
- Cadastrar 1–2 categorias de teste com `grupos_whatsapp` apontando para um
  grupo de teste (nunca um grupo real nesta fase).

### 2. Formulário (captura)
- PWA simples: dropdown de categoria (lido de `categorias` onde `ativa =
  true`) + campo de link + botão salvar. Sem campos extras.
- Ao salvar: normalizar o link (aceitar colado sem `https://`) e detectar
  `plataforma` pelo domínio, incluindo os links curtos de afiliado — lista
  em `PLATAFORMAS` (`app/utils/plataforma.ts`), ex.: `meli.la`,
  `s.shopee.com.br`/`shope.ee`, `amzn.to`/`a.co`, `vm.tiktok.com`,
  `maga.lu`/`divulgador.magalu.com`, `s.click.aliexpress.com`,
  `onelink.shein.com`. Domínio desconhecido → `outra` (aceito). Confirmar
  os domínios curtos reais de cada painel de afiliados.
  - Inserir em `ofertas`, disparar a Edge Function de enriquecimento
    (chamada direta ou trigger de banco).

### 3. Enriquecimento de dados
- Edge Function que recebe o link da oferta, **segue o redirecionamento**
  (os links curtos de afiliado, como `meli.la/...`, redirecionam para a
  página real do produto — isso é necessário antes de extrair qualquer
  dado), faz `fetch` da página pública do produto (sem autenticação) e
  extrai título, preço, preço original e imagem do conteúdo/JSON que a
  própria página carrega no HTML.
- Ordem de leitura: (1) leitor específico da loja, se existir; (2) leitor
  genérico — JSON-LD `schema.org/Product` (`offers.price`, `name`,
  `image`), depois meta tags Open Graph/`product:price:amount`, depois
  `<title>`/`og:image`. Nenhuma chamada a API de afiliados em nenhuma loja.
- Lojas com leitura difícil (anti-bot ou página montada por JavaScript):
  Mercado Livre e **Amazon** (anti-bot forte), **TikTok Shop** (links
  `vm.tiktok.com` costumam abrir conteúdo de app/JS). Para essas, mesmo
  fallback de navegador headless descrito abaixo.
- **Quando a leitura falha** (loja `outra` sem dados estruturados, bloqueio
  etc.) — **decidido**: a oferta entra no painel como `rejeitada` com
  `motivo` explicando, e o painel oferece **"Tentar de novo"**. O formulário
  do assistente NÃO pede título/preço manual. A IA continua proibida de
  inventar preço/desconto.
- **Mercado Livre tem proteção anti-bot ativa** (confirmado na prática: um
  `fetch` simples pode ser bloqueado). Primeiro tentar com headers de
  navegador real (user-agent, accept-language etc.); se mesmo assim for
  bloqueado de forma consistente, o fallback é renderizar a página com um
  navegador headless (ex.: Playwright) só para ler o HTML público — ainda
  sem login, sem cookie de sessão, sem credencial, só simulando um visitante
  normal. Avaliar esse fallback com o usuário antes de implementar, porque
  é mais infraestrutura.
- Falha na extração → grava `postagens.status = 'rejeitada'` com
  `motivo_rejeicao`, não tenta adivinhar o dado.
- Tratar como frágil: a estrutura da página pode mudar; não deixar a função
  quebrar o pipeline inteiro, só aquela postagem.

**Implementado** (`server/utils/leitorProduto.ts`, `processarOferta.ts`):
- Roda no servidor do app logo após gravar a oferta (formulário público e
  painel) e no "Tentar de novo" (`POST /api/ofertas/:id/processar`).
- **Mercado Livre:** o `meli.la` costuma abrir a página "social" do afiliado
  (`/social/<afiliado>`) com dezenas de produtos; o certo é o **card em
  destaque** (título = `og:title`, preço em `current_price`, "de" em
  `previous_price`, rótulo em `discount_label`). Página normal do produto:
  JSON-LD + `andes-money-amount--previous`.
- **Shopee:** o link curto (`s.shopee.com.br`) responde 200 e redireciona por
  JavaScript (`var CONFIG={httpUrl:"…"}`) → seguir esse destino. Ele chega em
  `/opaanlp/<loja>/<item>`, que não tem dados; ler `/product/<loja>/<item>`.
  Ali há nome (`og:title`), foto (`og:image`) e `show_discount` (%), mas **os
  preços vêm `null` sem login** (proteção da Shopee; as rotas `/api/v4/*`
  dão 403 — não usar). Decisão: publicar **sem preço**, com o desconto e
  "confira o preço no link" (`preco = null` só é aceito em loja que esconde o
  preço de propósito). Futuro: **Shopee Affiliate Open API** (acesso já
  solicitado pelo usuário) para preencher o preço — exceção aprovada à regra
  "nenhuma API de afiliados", por credencial de cada cliente.
  Em guia anônima o preço aparece (o JS da página assina a requisição; sem
  login). Navegador automático (Playwright) no servidor seria viável, mas foi
  **adiado pelo usuário** (peso/hospedagem/risco de bloqueio) — não reabrir
  sem ele pedir.
- **Condição do preço:** quando a loja diz "no Pix", o preço só vale no Pix →
  `ofertas.condicao_preco = 'no Pix'` e a legenda tem que dizer. O % de
  desconto usado é o **da loja** (`desconto_rotulo`), não a conta.
- Foto = a real da página (`og:image`). **Nunca gerar imagem de produto com
  IA** (enganoso). Arte com selo de preço, se houver, é montada por código.

### Legenda (implementado — `server/utils/legenda.ts`)
- **OpenRouter**, modelo `anthropic/claude-haiku-5.5` (configurável:
  `OPENROUTER_MODELO`), `reasoning` desligado (senão a resposta vem cortada).
- Preço, "de", desconto e condição vão como textos exatos; a resposta só é
  aceita se tiver o preço e o link exatos, nenhum outro R$ e nenhuma outra
  porcentagem (exceto as do título). Senão → modelo pronto sem IA. O rodapé
  das Configurações é anexado pelo código, nunca pela IA.
- Formatação WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`; sem urgência
  inventada. Botão "Outra" → `POST /api/ofertas/:id/legenda`.

### 4. Filtro de regras
- Antes de aprovar: link/dado completos; não é duplicata (`link_afiliado`
  já único no banco cobre isso); limite diário da categoria/grupo não
  estourado (senão mantém `pendente` para o próximo ciclo).
- Aprovado → `postagens.status = 'aprovada'`.

### 5. Legenda com IA
- Prompt recebe título, preço, preço original, desconto e link como dados
  fixos — instruir explicitamente o modelo a não alterar nem inventar esses
  valores, só escrever texto em torno deles.
- Variar a abertura entre chamadas para não parecer sempre o mesmo template.
- Tom direto, no máximo 1–3 emojis, sempre terminando com o link.
- Gravar resultado em `postagens.legenda_gerada`.

### 6. Envio ao WhatsApp
- UazAPI, uma instância por cliente. Ordem: criar instância → conectar
  (QR code) + status → listar grupos (sincronizar em `whatsapp_destinos`) →
  enviar mensagem → webhook de status/desconexão. Pedir a doc de cada
  endpoint ao usuário antes de implementar.
- **Dois modos de conexão** (tela `/painel/whatsapp`, estado em
  `useWhatsapp`): **código de pareamento pelo número** (padrão no celular —
  o afiliado só tem o celular, então não consegue escanear um QR exibido
  nele mesmo) e **QR code** (padrão no desktop). Código/QR vencem
  (~45s): renovar até 3 vezes e depois voltar a "desconectado". Pedir a
  doc da UazAPI para os dois (QR e pair code).
- Número dedicado recomendado ao cliente, nunca o principal.
- **Instância (implementado)** — `server/utils/uazapi.ts`: `POST /instance/create`
  com header `admintoken` (env `UAZAPI_URL`, `UAZAPI_ADMIN_TOKEN`), corpo
  `{ name, systemName: "LinkAfiliado", adminField01: owner_id }`. Resposta traz
  `instance.token` (guardar em `whatsapp_credenciais`, nunca no navegador) e
  `instance.id`. Criada sob demanda (`POST /api/whatsapp/instancia`), uma por
  cliente. Status da UazAPI: disconnected | connecting | connected | hibernated.
  **429 = limite de instâncias do plano** (`max_instances`): cada cliente
  consome 1 instância → o plano da UazAPI precisa crescer com os clientes.
- **Status (implementado)** — `GET /instance/status` com header `token` (da
  instância). `GET /api/whatsapp/status` lê, espelha em `whatsapp_conexoes`
  (connected→conectado, connecting→aguardando, resto→desconectado) e devolve
  nome do perfil, número, foto, motivo da última desconexão; QR/paircode só
  enquanto conectando. **Na prática `status.jid` vem como texto**
  (`"5585…:48@s.whatsapp.net"`), não objeto como na doc — tratar os dois.
  Token inválido → 401 "instance info not found".
- **Instância de teste do usuário: `theus`** (ligada à conta dele à mão). Ela é
  usada por OUTRO sistema dele (`systemName: ecommerceBi`): só leitura. Antes
  de desconectar, trocar webhook ou enviar mensagens por ela, **perguntar**.
- Nunca enviar em sequência imediata — sempre via fila (próximo item).

### 7. Fila de envio (cron)
- `pg_cron` roda periodicamente, pega postagens `aprovada` sem envio ainda,
  aplica um intervalo aleatório entre `intervalo_min_minutos` e
  `intervalo_max_minutos` (de `config`) antes de cada envio, respeita o
  limite diário por grupo.
- Registrar cada tentativa em `envios` (sucesso/erro) — usar isso para
  detectar quando o número está sendo limitado pelo WhatsApp.

### 8. Captação de membros (entrada nos grupos)

Regra: **nunca adicionar números ao grupo sem a pessoa pedir** (bloqueio do
WhatsApp, privacidade e LGPD). A pessoa sempre entra por ação própria; o
sistema só torna isso fácil. Três mecanismos, todos no projeto:

**A. Link próprio + página de entrada por categoria**
- Rota pública `/g/<slug>` (ex.: `/g/casa-cozinha`) por categoria. Página
  com nome, nº de membros, exemplos de ofertas recentes e botão "Entrar no
  grupo" → redireciona para o convite `chat.whatsapp.com/...` do grupo
  ativo. Open Graph caprichado (prévia ao compartilhar nas redes).
- O link divulgado é sempre o nosso, nunca o do WhatsApp direto: sobrevive
  à revogação do convite, permite rastrear origem (`?src=instagram`,
  `tiktok`, `bio`) e permite trocar o grupo de destino.
- No painel (tela de grupos): copiar convite, QR code do link, revogar e
  gerar novo convite. Requer o número conectado como **admin** do grupo.

**B. Grupos que se multiplicam (rotação automática)**
- Cada categoria pode ter vários grupos em sequência. Quando o ativo chega
  perto do limite (configurável, ex.: 90% da capacidade), o sistema cria o
  próximo via API ("<Nome> #2"), copiando foto, descrição e configuração
  "só admins enviam", e o `/g/<slug>` passa a apontar para ele.
- O envio de ofertas continua indo para todos os grupos da categoria.

**C. Entrada por palavra-chave**
- Post diz "manda QUERO CASA": link `wa.me/<numero>?text=QUERO%20CASA`.
- Webhook de mensagem recebida (UazAPI) → casa a palavra-chave com a
  categoria → responde com o convite do grupo ativo (via `/g/<slug>`).
- Grava o lead (número, palavra-chave, data, origem) — a pessoa iniciou a
  conversa, então há consentimento. Responder só a quem pediu; limitar
  respostas por número para evitar abuso.

**O que cada caminho captura (tela `/painel/leads`)**
- Clique em `/g/<slug>`: **só quantidade** — categoria, data, `src`,
  referrer, tipo de aparelho. Sem nome/número; não guardar IP identificável
  (no máximo hash anônimo para deduplicar).
- Palavra-chave (webhook de mensagem): **número + nome de perfil
  (pushName)** — pushName pode ser apelido/emoji/vazio. Único caminho com
  consentimento claro e identificação; é o que alimenta a lista de leads.
- Entrada no grupo (webhook de participante): **identificador do
  participante** (normalmente o número; nome raramente). O WhatsApp pode
  entregar um ID anônimo (LID) em vez do número — confirmar na doc da UazAPI.
- Clique → entrada não se liga individualmente (o convite abre o app);
  só por estimativa agregada. Palavra-chave → entrada liga pelo número
  (badge "Entrou"). Não pedir dados na página de entrada (atrito).

**Extras**
- Boas-vindas automáticas no grupo (webhook de participante entrou).
- Grupos em modo "só admins enviam" por padrão.
- Comunidades do WhatsApp agrupando os grupos da categoria, se a UazAPI
  suportar.

**Dados** (todas com `owner_id` + RLS):
- `categorias`: + `emoji`, `slug` (unique por owner; gerado do nome),
  `palavra_chave` (unique por owner; ex. "QUERO CASA"), `descricao` (página
  de entrada), `auto_criar` (cria grupo ao lotar), `padrao_nome` (nome dos
  grupos novos, `#` vira o número), `so_admins` (config dos grupos novos).
  Excluir categoria → grupos dela viram "sem categoria" e param de receber.
- Criar grupo pelo painel (botão "Novo grupo" na tela de Grupos) usa
  `padrao_nome` e `so_admins` da categoria e entra no fim da rotação. O
  WhatsApp exige ao menos 1 participante ao criar grupo — confirmar na doc
  da UazAPI como tratar.
- `whatsapp_destinos`: + `convite_url`, `membros`, `capacidade`, `ordem`,
  `ativo_para_entrada` (qual grupo recebe novos membros), `admin boolean`.
- `cliques_entrada` (categoria_id, destino_id, origem, criado_em).
- `leads` (numero, palavra_chave, categoria_id, origem, criado_em).

**Docs da UazAPI a pedir ao usuário** (antes de cada parte): obter/revogar
convite do grupo; criar grupo e configurar nome, foto, descrição e "só
admins"; nº de participantes; webhook de participante entrou; webhook de
mensagem recebida; enviar mensagem a contato (resposta da palavra-chave);
comunidades.

**Ordem:** A → B → extras (boas-vindas, só admins) → C (depende do webhook
de mensagens recebidas).

## Riscos a ter em mente ao implementar

| Risco | Mitigação no código |
| --- | --- |
| Número de WhatsApp bloqueado/alcance reduzido | número dedicado, intervalo aleatório, limite diário, nunca madrugada |
| Página pública do produto muda de estrutura | falha de parser rejeita a postagem, nunca publica com dado incerto; logar taxa de rejeição |
| Loja bloqueia a leitura por detecção de bot (ML, Amazon…) | tentar com headers de navegador real; fallback para navegador headless (sem login) se o bloqueio persistir |
| IA inventa preço/desconto | esses valores nunca entram no prompt como "a decidir" — sempre fixos, vindos do enriquecimento |
| Regras do programa de afiliados (ex.: Amazon restringe onde links e preços podem ser exibidos) | avisar no painel que cada afiliado deve conferir as regras do próprio programa sobre divulgar em grupos de WhatsApp |
| Postagem duplicada | `unique (link_afiliado)` no banco |
| Pipeline falha silenciosamente | toda etapa grava status/erro; alerta se um ciclo não gerar nenhum envio aprovado |
| Oferta expira antes do envio | se o intervalo da fila for longo, revalidar dado antes de enviar em vez de confiar no que foi capturado há horas |
| Número banido por adicionar gente ao grupo | nunca adicionar sem pedido; entrada sempre por link/convite ou palavra-chave |
| Convite vazado/revogado quebra links divulgados | divulgar só `/g/<slug>`, que resolve o convite atual na hora |
| Grupo lota e novos membros não entram | rotação automática para o próximo grupo antes do limite |
| Abuso da palavra-chave (spam no número) | responder só uma vez por número em X horas; rate limit no webhook |

## Checklist de aceite por etapa

- [ ] Formulário salva oferta corretamente e detecta a loja certa (inclusive links curtos como `meli.la`, `amzn.to`, `vm.tiktok.com`) e aceita loja desconhecida como `outra`
- [ ] Enriquecimento segue o redirecionamento de link curto até a página real do produto
- [ ] Enriquecimento retorna título/preço/imagem corretos para um link real de cada loja conhecida; leitor genérico funciona numa loja `outra` com JSON-LD
- [ ] Falha de enriquecimento (incluindo bloqueio anti-bot) rejeita a postagem sem derrubar o restante do pipeline
- [ ] Filtro barra duplicata e respeita limite diário
- [ ] Legenda gerada nunca diverge do preço/desconto extraído
- [ ] Envio funciona em 1 grupo de teste com intervalo aleatório
- [ ] Log em `envios` permite auditar sucesso/erro de cada tentativa
- [ ] `/g/<slug>` abre a página de entrada e leva ao convite do grupo ativo; clique registrado com a origem
- [ ] Revogar o convite no painel não quebra o `/g/<slug>` já divulgado
- [ ] Grupo perto do limite gera o próximo automaticamente e o `/g/<slug>` passa a apontar para ele
- [ ] Mensagem com a palavra-chave recebe o convite certo uma única vez e vira lead
- [ ] Boas-vindas disparam quando alguém entra no grupo
