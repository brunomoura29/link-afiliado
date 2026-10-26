# Publicar no Easypanel

O app roda como um servidor Node sempre ligado (Dockerfile na raiz). A fila de envio
(a cada minuto) e a repetição das ofertas (de hora em hora) rodam **dentro do app**, como
tarefas agendadas — não precisa de cron externo.

## 1. Criar o app

1. No projeto do Easypanel: **+ Service → App**.
2. **Source**: o repositório do GitHub (branch `master`) — ou "Upload" do código.
3. **Build**: `Dockerfile` (caminho `Dockerfile`, na raiz).
4. **Deploy → Replicas: 1.** Com mais de uma, a fila rodaria em cada cópia.
5. **Domains**: adicione o domínio (ex.: `app.seudominio.com.br`), porta **3000**, HTTPS ligado.

## 2. Variáveis de ambiente (aba Environment)

| Variável | Valor |
|---|---|
| `NUXT_PUBLIC_URL_BASE` | o domínio com https, sem barra no fim (ex.: `https://app.seudominio.com.br`) |
| `NUXT_PUBLIC_SUPABASE_URL` | mesmo valor de `SUPABASE_URL` do `.env` |
| `NUXT_PUBLIC_SUPABASE_KEY` | mesmo valor de `SUPABASE_KEY` (chave pública) |
| `NUXT_SUPABASE_SECRET_KEY` | mesmo valor de `SUPABASE_SECRET_KEY` (**secreta**) |
| `NUXT_UAZAPI_URL` | mesmo valor de `UAZAPI_URL` |
| `NUXT_UAZAPI_ADMIN_TOKEN` | mesmo valor de `UAZAPI_ADMIN_TOKEN` (**secreta**) |
| `NUXT_OPENROUTER_API_KEY` | mesmo valor de `OPENROUTER_API_KEY` (**secreta**) |
| `NUXT_FILA_SEGREDO` | mesmo valor de `FILA_SEGREDO` (ou gere outro) |
| `NUXT_FILA_AUTOMATICA` | `true` — liga a fila e a repetição. Só aqui, nunca no computador |

Opcional: `NUXT_OPENROUTER_MODELO` (modelo da legenda; padrão no `nuxt.config.ts`).

Depois de salvar as variáveis, faça **Deploy** de novo.

## 3. Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: o domínio (ex.: `https://app.seudominio.com.br`)
- **Redirect URLs**: adicione `https://app.seudominio.com.br/**`

Sem isso, login e cadastro mandam a pessoa para `localhost`.

## 4. Conferir

- Abrir o domínio: a tela de login aparece.
- Entrar e abrir **WhatsApp**: o status da conexão aparece.
- Logs do app (aba Logs): sem erros a cada minuto.
- Mandar uma oferta para uma categoria que só tem um grupo de teste e acompanhar na
  tela da oferta: ela sai no intervalo das Configurações.

## Como funciona o agendamento

| Tarefa | Quando | O que faz |
|---|---|---|
| `fila:processar` | a cada minuto | manda no máximo 1 envio por número, respeitando intervalo, horário e limite diário |
| `ofertas:repetir` | de hora em hora (minuto 7) | põe na fila a próxima rodada das ofertas que repetem (lê o produto de novo antes) |

As duas não fazem nada sem `NUXT_FILA_AUTOMATICA=true`. A rota `POST /api/fila/processar`
(header `x-fila-segredo`) roda uma rodada da fila à mão, se precisar.
