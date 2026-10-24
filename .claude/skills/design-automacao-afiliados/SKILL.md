---
name: design-automacao-afiliados
description: Use this skill when building or styling the UI of the affiliate automation project (the capture form/PWA, any admin or dashboard screens) — design tokens, typography and the marketplace-inspired color palette to use across the project.
---

# Design — Automação de Afiliados

Sistema de design leve para as telas deste projeto (formulário de captura,
futura tela de administração/fila). Objetivo: legível, rápido de usar no
celular, com identidade visual que remete aos marketplaces sem copiar logos
ou marcas registradas.

## Celular primeiro (obrigatório em toda tela)

A maioria dos afiliados **não tem computador** e usa tudo pelo celular —
inclusive o painel. Toda tela (pública ou do painel) é desenhada e testada
primeiro em ~360–390px de largura; o desktop é a adaptação, não o contrário.

- Sem rolagem horizontal da página; margem lateral de 16px.
- Alvos de toque com no mínimo 44–48px; ações principais ao alcance do
  polegar (botão principal fixo no rodapé quando a tela tiver formulário).
- Respeitar `env(safe-area-inset-*)` (notch e barra de gestos).
- Seleção de categoria e listas de opções: usar **dropdown** (`UiSelecao`,
  seletor nativo do celular), não grade de botões/chips — preferência do
  usuário após testar as duas. Tabelas viram lista de cards no celular.
- Formulários limpos: título + subtítulo e campos em sequência, sem
  numeração de etapas ("1", "2").
- Navegação do painel: barra inferior no celular, menu lateral só a partir
  de `lg`.
- Facilitar o que é chato no celular: botão "Colar" ao lado de campos de
  link, `inputmode` correto, lembrar última escolha, copiar com um toque.
- Tudo leve: fonte servida pelo próprio app (sem CDN externo), imagens
  otimizadas, nada que trave em 4G.

## Tipografia

**Plus Jakarta Sans** (escolha do usuário), versão variável servida pelo
próprio app via `@fontsource-variable/plus-jakarta-sans` — nada de Google
Fonts/CDN. O navegador baixa só os caracteres usados (latin).

```css
--font-sans: "Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif,
  system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
```

Escala (mobile-first; a tela principal é o formulário, então o corpo do texto
é a prioridade):

| Uso | Tamanho | Altura de linha | Peso |
| --- | --- | --- | --- |
| Corpo / inputs | 16px | 24px | 400 (inputs nunca abaixo de 16px: o iPhone dá zoom ao focar) |
| Label / texto auxiliar | 14px | 21px | 400 |
| Título de tela | 20px | 28px | 600 |
| Botão principal | 16px | 24px | 600 |

```css
body, input, select, button {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
}
```

## Cores

### Base (neutra, tema claro)

```css
--color-text-primary: #0d0d0d;
--color-text-secondary: #5c5c5c;
--color-border: #e3e3e3;
--color-background: #ffffff;
--color-surface: #f7f7f7;
```

### Base (tema escuro)

```css
--color-text-primary: #f2f2f2;
--color-text-secondary: #a3a3a3;
--color-border: #333333;
--color-background: #121212;
--color-surface: #1b1b1b;
```

### Marketplaces (uso em badges, tags de plataforma, bordas de card — nunca
para recriar o logo ou a marca de cada site, só para sinalizar rapidamente
"isso é Shopee" / "isso é Mercado Livre" numa lista)

```css
--brand-shopee: #ee4d2d;       /* laranja Shopee */
--brand-shopee-tint: #fdeae6;  /* fundo claro do badge Shopee */

--brand-ml-yellow: #fff159;    /* amarelo Mercado Livre */
--brand-ml-blue: #3483fa;      /* azul Mercado Livre */
--brand-ml-tint: #fffbe0;      /* fundo claro do badge ML */

--brand-whatsapp: #25d366;     /* verde WhatsApp — usar só em estado de envio/sucesso */

/* Outras lojas (só o ponto colorido do badge neutro) */
--brand-amazon: #ff9900;
--brand-tiktok: #fe2c55;
--brand-magalu: #0086ff;
--brand-aliexpress: #e62e04;
/* Shein: cor do texto (--color-text-primary); "Outra loja": --color-text-secondary */
```

### Semânticas (status de postagem)

```css
--status-pendente: #a3a3a3;    /* cinza — aguardando */
--status-aprovada: #1a7f37;    /* verde — passou no filtro */
--status-rejeitada: #c81e3a;   /* vermelho — falhou enriquecimento/duplicata */
--status-enviada: var(--brand-whatsapp);
```

## Aplicação por componente

- **Badge de plataforma** (lista de ofertas/postagens): fundo
  `--brand-shopee-tint` + texto `--brand-shopee` para Shopee; fundo
  `--brand-ml-tint` + texto `--brand-ml-blue` para Mercado Livre. **Demais
  lojas** (Amazon, TikTok Shop, Magalu, AliExpress, Shein, "Outra loja"):
  badge neutro (`--color-surface` + borda) com um ponto na cor da loja —
  evita uma tela cheia de cores de marca. Texto da badge sempre em peso
  600, 14px.
- **Botão principal** (salvar no formulário): fundo `--color-text-primary`
  (preto), texto branco, `border-radius: 8px`, altura mínima 48px (alvo de
  toque confortável no celular).
- **Input / select de categoria**: borda `--color-border`, fundo
  `--color-surface`, `border-radius: 8px`, padding 12px 16px.
- **Status da postagem** (se houver tela de acompanhamento): ponto ou badge
  colorido com as cores semânticas acima — nunca só texto, para dar leitura
  rápida de longe.
- **Espaçamento**: múltiplos de 8px (8 / 16 / 24 / 32) — consistente com o
  resto do produto.
- **Cantos**: `border-radius: 8px` em cards e inputs, `999px` (pill) em
  badges.

## O que evitar

- Não recriar o logo, o ícone ou a tipografia de marca da Shopee/Mercado
  Livre/WhatsApp — só as cores, como sinalização funcional.
- Não usar `--brand-whatsapp` fora do contexto de envio/sucesso — ele
  confunde com "aprovado" se usado em outro lugar.
- Evitar mais de duas cores de marca visíveis na mesma tela ao mesmo tempo
  (ex.: não pintar o botão principal de laranja Shopee — isso é para badges,
  não para a identidade geral da ferramenta).
