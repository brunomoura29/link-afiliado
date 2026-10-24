// Lê a página pública do produto (sem API de afiliados, sem login, sem cookie).
// Ordem: leitor específico da loja → leitor genérico (JSON-LD / Open Graph / microdados).
// Se não achar título E preço, falha com um motivo legível (vira "rejeitada" no painel).

export interface ProdutoLido {
  titulo: string
  preco: number | null // null só quando a loja esconde o preço de propósito (ex.: Shopee)
  precoOriginal: number | null
  imagem: string | null
  itemId: string | null
  descontoRotulo: string | null // texto da própria loja, ex.: "20% OFF no Pix"
  condicaoPreco: string | null // ex.: "no Pix" — a legenda precisa dizer
  urlFinal: string
}

export class FalhaLeitura extends Error {}

const NAVEGADOR = {
  'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.6'
}

// Segue os redirecionamentos do link curto de afiliado até a página real
async function baixar(link: string) {
  let url = link
  for (let salto = 0; salto < 8; salto++) {
    let r: Response
    try {
      r = await fetch(url, { headers: NAVEGADOR, redirect: 'manual', signal: AbortSignal.timeout(12_000) })
    } catch {
      throw new FalhaLeitura('A página da loja não respondeu. Tente de novo em alguns minutos.')
    }
    const destino = r.headers.get('location')
    if (r.status >= 300 && r.status < 400 && destino) {
      url = new URL(destino, url).href
      continue
    }
    if (r.status === 403 || r.status === 429 || r.status === 503) {
      throw new FalhaLeitura('A loja bloqueou a leitura da página do produto. Tente de novo mais tarde.')
    }
    if (r.status === 404 || r.status === 410) throw new FalhaLeitura('O produto não foi encontrado: o link pode ter expirado.')
    if (!r.ok) throw new FalhaLeitura(`A loja respondeu com erro (${r.status}). Tente de novo mais tarde.`)
    if (!(r.headers.get('content-type') ?? '').includes('html')) throw new FalhaLeitura('O link não abre uma página de produto.')
    const html = await r.text()
    // Link curto da Shopee redireciona por JavaScript: var CONFIG={httpUrl:"https:\/\/shopee.com.br\/..."}
    const viaScript = html.match(/CONFIG\s*=\s*\{\s*httpUrl\s*:\s*"([^"]+)"/)?.[1]
    if (viaScript) {
      url = new URL(JSON.parse(`"${viaScript}"`), url).href
      continue
    }
    return { html, url }
  }
  throw new FalhaLeitura('O link redireciona demais e não chega numa página de produto.')
}

// ── Utilitários de leitura ──

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }
const texto = (v: string | undefined | null) =>
  v ? v.replace(/&(amp|quot|#39|#x27|lt|gt|nbsp);/g, e => ENTIDADES[e] ?? e).replace(/\s+/g, ' ').trim() : null

function meta(html: string, nome: string) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${nome}["'][^>]*content=["']([^"']*)["']`, 'i'))
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${nome}["']`, 'i'))
  return texto(a?.[1] ?? b?.[1])
}

// "1.234,56" | "1234.56" | 173.13 → número
function numero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null
  if (typeof v !== 'string') return null
  let s = v.replace(/[^\d.,]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

function produtosJsonLd(html: string): Record<string, any>[] {
  const encontrados: Record<string, any>[] = []
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const fila = [JSON.parse(m[1]!)]
      while (fila.length) {
        const x = fila.shift()
        if (Array.isArray(x)) fila.push(...x)
        else if (x && typeof x === 'object') {
          if (x['@graph']) fila.push(x['@graph'])
          const tipo = [x['@type']].flat()
          if (tipo.includes('Product')) encontrados.push(x)
        }
      }
    } catch {}
  }
  return encontrados
}

// ── Leitor genérico (qualquer loja que publique dados estruturados) ──

function lerGenerico(html: string): Partial<ProdutoLido> {
  const p = produtosJsonLd(html)[0]
  const ofertas = p ? [p.offers].flat().filter(Boolean) : []
  const oferta = ofertas[0] ?? {}
  const imagemLd = p ? [p.image].flat()[0] : null
  return {
    titulo: texto(p?.name) ?? meta(html, 'og:title') ?? texto(html.match(/<title[^>]*>([^<]*)/i)?.[1]),
    preco: numero(oferta.price) ?? numero(oferta.lowPrice) ?? numero(meta(html, 'product:price:amount'))
      ?? numero(meta(html, 'og:price:amount')) ?? numero(meta(html, 'price')),
    imagem: (typeof imagemLd === 'string' ? imagemLd : imagemLd?.url) ?? meta(html, 'og:image'),
    itemId: texto(p?.sku) ?? texto(p?.productID)
  }
}

// ── Mercado Livre ──
// Link de afiliado (meli.la) costuma abrir a página "social" do afiliado, com o produto
// em destaque num card (JSON embutido); também tratamos a página normal do produto.

function lerMercadoLivre(html: string): Partial<ProdutoLido> | null {
  const titulo = meta(html, 'og:title')
  if (!titulo) return null

  // Card em destaque: o título aparece no JSON e o bloco de preço vem logo depois
  const tituloJson = JSON.stringify(titulo).slice(1, -1)
  const i = html.indexOf(`"text":"${tituloJson}"`)
  if (i !== -1) {
    const depois = html.slice(i, i + 4000)
    const atual = depois.match(/"current_price":\{"value":([\d.]+)/)?.[1]
    if (atual) {
      const anterior = depois.match(/"previous_price":\{"value":([\d.]+)/)?.[1]
      const rotulo = texto(depois.match(/"discount_label":\{"text":"([^"]+)"/)?.[1])
      const antes = html.slice(Math.max(0, i - 4000), i)
      const ids = [...antes.matchAll(/"id":"(MLB\d+)"/g)]
      return {
        titulo,
        preco: numero(Number(atual)),
        precoOriginal: anterior ? numero(Number(anterior)) : null,
        imagem: meta(html, 'og:image'),
        itemId: ids.at(-1)?.[1] ?? null,
        descontoRotulo: rotulo,
        condicaoPreco: rotulo && /pix/i.test(rotulo) ? 'no Pix' : null
      }
    }
  }

  // Página do produto: preço atual pelos dados estruturados, preço "de" pelo HTML
  const generico = lerGenerico(html)
  const anterior = html.match(/andes-money-amount--previous[\s\S]{0,600}?andes-money-amount__fraction[^>]*>([\d.]+)<(?:[\s\S]{0,200}?andes-money-amount__cents[^>]*>(\d+)<)?/)
  return {
    ...generico,
    titulo: generico.titulo ?? titulo,
    precoOriginal: anterior ? numero(`${anterior[1]!.replace(/\./g, '')}.${anterior[2] ?? '00'}`) : null,
    itemId: generico.itemId ?? html.match(/MLB-?(\d{6,})/)?.[0]?.replace('-', '') ?? null
  }
}

// ── Shopee ──
// A página pública traz nome, foto e % de desconto, mas os preços vêm vazios para quem
// não está logado (proteção da própria Shopee). Sem API, publicamos com o desconto e
// "confira o preço no link". TODO: preço pela Shopee Affiliate Open API quando liberada.

const idsShopee = (url: string) =>
  url.match(/shopee\.com\.br\/(?:product|opaanlp)\/(\d+)\/(\d+)/) ?? url.match(/-i\.(\d+)\.(\d+)/)

async function lerShopee(url: string, html: string): Promise<Partial<ProdutoLido> & { precoOculto: boolean }> {
  const ids = idsShopee(url)
  // A página "opaanlp" (destino do link de afiliado) não tem os dados; a /product/ tem
  if (ids && !/\/product\//.test(url)) {
    html = (await baixar(`https://shopee.com.br/product/${ids[1]}/${ids[2]}`)).html
  }
  const desconto = Number(html.match(/"show_discount":(\d{1,2})/)?.[1]) || null
  // Se um dia o preço vier na página, aproveita (a Shopee usa preço x 100000)
  const bruto = Number(html.match(/"price_min":(\d+)/)?.[1] ?? html.match(/"price":(\d{6,})/)?.[1])
  const antes = Number(html.match(/"price_min_before_discount":(\d+)/)?.[1] ?? html.match(/"price_before_discount":(\d{6,})/)?.[1])
  return {
    titulo: meta(html, 'og:title')?.replace(/\s*\|\s*Shopee Brasil\s*$/i, '') ?? null,
    preco: bruto ? bruto / 100000 : null,
    precoOriginal: antes ? antes / 100000 : null,
    imagem: meta(html, 'og:image'),
    itemId: ids ? `${ids[1]}.${ids[2]}` : null,
    descontoRotulo: desconto ? `${desconto}% OFF` : null,
    precoOculto: true
  }
}

// ── Entrada ──

export async function lerProduto(link: string): Promise<ProdutoLido> {
  const { html, url } = await baixar(link)
  const plataforma = detectarPlataforma(url)

  const lido: Partial<ProdutoLido> & { precoOculto?: boolean } =
    plataforma === 'shopee' ? await lerShopee(url, html)
      : (plataforma === 'mercado_livre' ? lerMercadoLivre(html) : null) ?? lerGenerico(html)

  if (!lido.titulo) throw new FalhaLeitura('Não encontramos o nome do produto na página.')
  // Sem preço só é aceito em loja que esconde o preço de propósito; nas outras é sinal de página errada
  if (!lido.preco && !lido.precoOculto) {
    throw new FalhaLeitura('Não encontramos o preço na página do produto. Confira se o link abre o produto certo.')
  }

  const preco = lido.preco ? Math.round(lido.preco * 100) / 100 : null
  const original = preco && lido.precoOriginal && lido.precoOriginal > preco ? Math.round(lido.precoOriginal * 100) / 100 : null
  return {
    titulo: lido.titulo.slice(0, 300),
    preco,
    precoOriginal: original,
    imagem: lido.imagem?.startsWith('http') ? lido.imagem : null,
    itemId: lido.itemId ?? null,
    descontoRotulo: lido.descontoRotulo ?? null,
    condicaoPreco: lido.condicaoPreco ?? null,
    urlFinal: url
  }
}
