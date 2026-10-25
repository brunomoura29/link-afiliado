// Foto de grupo do WhatsApp: JPEG de até 640x640. Recorta o centro em quadrado e reduz
// no navegador, para mandar pronta (data URL) e leve (o servidor aceita até ~300 KB).
export async function prepararFotoGrupo(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const tamanho = Math.min(640, lado)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = tamanho
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // PNG transparente não fica preto no JPEG
    ctx.fillRect(0, 0, tamanho, tamanho)
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, tamanho, tamanho)
    for (const qualidade of [.85, .7, .55]) {
      const dados = canvas.toDataURL('image/jpeg', qualidade)
      if (dados.length <= 400_000) return dados
    }
    throw new Error('grande')
  } finally {
    URL.revokeObjectURL(url)
  }
}
