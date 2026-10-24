// Legenda da oferta escrita por IA (OpenRouter). Preço, preço "de", desconto e condição
// ("no Pix") entram como textos prontos: a IA só escreve em volta deles. Se a resposta
// trouxer qualquer outro valor em R$ ou esquecer o preço/link, vale o modelo pronto.
// Loja que esconde o preço (ex.: Shopee): nenhum valor em R$ e "confira o preço no link".

export interface DadosLegenda {
  titulo: string
  preco: number | null // null = a loja não mostra o preço
  precoOriginal: number | null
  condicaoPreco: string | null
  descontoRotulo?: string | null // "20% OFF no Pix": o % da loja vale mais que a conta
  link: string
}

export interface EstiloLegenda {
  tom: string // animado | direto | profissional
  emojis: boolean
  rodape: string
}

const TONS: Record<string, string> = {
  animado: 'animado e empolgado, como quem achou uma promoção imperdível',
  direto: 'direto ao ponto, curto, sem exageros',
  profissional: 'profissional e informativo, sem gírias'
}

// Mesmo formato do painel, com espaço comum (o Intl usa espaço não separável)
const semEspacoEspecial = (t: string) => t.replace(/\u00A0/g, ' ')
const reais = (v: number) => semEspacoEspecial(formatarPreco(v))

function valoresTravados(d: DadosLegenda) {
  const preco = d.preco != null ? reais(d.preco) : null
  const de = d.preco != null && d.precoOriginal ? reais(d.precoOriginal) : null
  // A loja arredonda do jeito dela (ex.: 20,9% vira "20% OFF"); usar o número dela evita divergência
  const daLoja = Number(d.descontoRotulo?.match(/(\d{1,2})\s*%/)?.[1])
  const conta = d.preco != null && d.precoOriginal ? Math.round((1 - d.preco / d.precoOriginal) * 100) : null
  return { preco, de, desconto: daLoja || conta, condicao: d.condicaoPreco }
}

const comRodape = (texto: string, estilo: EstiloLegenda) =>
  estilo.rodape.trim() ? `${texto.trim()}\n\n${estilo.rodape.trim()}` : texto.trim()

// Modelo pronto (sem IA): usado quando a IA falha ou não respeita os valores
export function legendaModelo(d: DadosLegenda, estilo: EstiloLegenda) {
  const v = valoresTravados(d)
  let linha: string
  if (v.preco) {
    const precoFrase = `${v.preco}${v.condicao ? ` ${v.condicao}` : ''}`
    linha = v.de ? `de ${v.de} por ${precoFrase}${v.desconto ? ` (${v.desconto}% OFF)` : ''}` : `por ${precoFrase}`
  } else {
    linha = v.desconto ? `com ${v.desconto}% OFF. Confira o preço no link.` : 'Confira o preço no link.'
  }
  const corpo = estilo.emojis ? `🔥 ${d.titulo}\n${linha}\n\n👉 ${d.link}` : `${d.titulo}\n${linha}\n\nLink: ${d.link}`
  return comRodape(corpo, estilo)
}

// A resposta da IA só vale se tiver o preço (quando há) e o link exatos, nenhum outro
// valor em R$ e nenhuma porcentagem além do desconto e das que estão no nome do produto
function respeitaValores(texto: string, d: DadosLegenda) {
  const v = valoresTravados(d)
  const t = semEspacoEspecial(texto)
  if (!t.includes(d.link)) return false
  if (v.preco && !t.includes(v.preco)) return false
  const permitidos = new Set([v.preco, v.de].filter(Boolean) as string[])
  const encontrados = t.match(/R\$\s?[\d.]+(,\d{2})?/g) ?? []
  if (!encontrados.every(r => permitidos.has(r.replace(/R\$\s?/, 'R$ ')))) return false
  const porcentagens = (t.match(/(\d{1,3})\s?%/g) ?? []).map(p => Number(p.replace(/\D/g, '')))
  const doTitulo = (d.titulo.match(/(\d{1,3})\s?%/g) ?? []).map(p => Number(p.replace(/\D/g, '')))
  return porcentagens.every(p => p === v.desconto || doTitulo.includes(p))
}

export async function gerarLegenda(d: DadosLegenda, estilo: EstiloLegenda): Promise<{ texto: string, ia: boolean }> {
  const { openrouterApiKey, openrouterModelo } = useRuntimeConfig()
  if (!openrouterApiKey) return { texto: legendaModelo(d, estilo), ia: false }

  const v = valoresTravados(d)
  const sistema = [
    'Você escreve legendas curtas de ofertas para grupos de WhatsApp no Brasil, em português do Brasil.',
    'Regras obrigatórias:',
    '- Use EXATAMENTE os textos de preço e de desconto fornecidos, sem mudar nenhum caractere. Nunca escreva outro valor em R$, outra porcentagem, parcelas ou frete.',
    '- Se houver condição do preço (ex.: "no Pix"), ela tem que aparecer colada ao preço.',
    '- Se o preço não for informado, NÃO escreva nenhum valor em R$: convide a conferir o preço no link.',
    '- Não invente características, garantia, estoque, prazo ou urgência que não estejam nos dados (nada de "antes que acabe", "últimas unidades", "só hoje").',
    '- Comece de um jeito diferente a cada vez; nada de começar sempre igual.',
    '- No máximo 350 caracteres antes do link. Sem hashtags.',
    '- Formatação do WhatsApp (um símbolo de cada lado): *negrito*, _itálico_, ~riscado~. Nunca use ** ou ~~. Use com moderação.',
    estilo.emojis ? '- Use de 1 a 3 emojis.' : '- Não use emojis.',
    `- Tom: ${TONS[estilo.tom] ?? TONS.animado}.`,
    `- Termine com o link sozinho na última linha, precedido de ${estilo.emojis ? '"👉 "' : '"Link: "'}.`,
    '- Responda só com a legenda, sem explicações.'
  ].join('\n')
  const usuario = [
    `Produto: ${d.titulo}`,
    v.preco
      ? `Preço (texto exato): ${v.preco}${v.condicao ? ` ${v.condicao}` : ''}`
      : 'Preço: não informado pela loja (não escreva valor; diga para conferir o preço no link).',
    v.preco && !v.de ? 'Sem preço antigo: não fale em "de/por".' : '',
    v.de ? `Preço antigo (texto exato): ${v.de}` : '',
    v.desconto ? `Desconto (texto exato): ${v.desconto}% OFF` : 'Sem desconto informado: não fale em porcentagem de desconto.',
    `Link: ${d.link}`
  ].filter(Boolean).join('\n')

  try {
    const r = await $fetch<{ choices?: { finish_reason?: string, message?: { content?: string } }[] }>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterApiKey}`, 'X-Title': 'LinkAfiliado' },
      body: {
        model: openrouterModelo,
        temperature: 0.9,
        max_tokens: 1000,
        reasoning: { enabled: false }, // legenda curta não precisa "pensar"; senão corta o texto
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }]
      },
      timeout: 30_000
    })
    const escolha = r.choices?.[0]
    const texto = semEspacoEspecial(escolha?.message?.content ?? '').trim()
    if (texto && escolha?.finish_reason !== 'length' && respeitaValores(texto, d)) return { texto: comRodape(texto, estilo), ia: true }
  } catch {}
  return { texto: legendaModelo(d, estilo), ia: false }
}
