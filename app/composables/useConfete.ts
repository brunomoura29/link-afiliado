const CORES = ['rgb(var(--shopee))', 'rgb(var(--ml-yellow))', 'rgb(var(--ml-blue))', 'rgb(var(--whatsapp))']

// Explosão curta de confete a partir de um elemento (ex.: botão salvar).
export function useConfete() {
  function disparar(origem: HTMLElement | null, quantidade = 28) {
    if (!origem || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = origem.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2

    for (let i = 0; i < quantidade; i++) {
      const p = document.createElement('span')
      const tamanho = 5 + Math.random() * 5
      Object.assign(p.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: `${tamanho}px`,
        height: `${tamanho * (Math.random() > .5 ? 1 : .45)}px`,
        background: CORES[i % CORES.length],
        borderRadius: Math.random() > .6 ? '999px' : '2px',
        pointerEvents: 'none',
        zIndex: '9999'
      })
      document.body.appendChild(p)

      const angulo = Math.random() * Math.PI * 2
      const forca = 60 + Math.random() * 110
      const dx = Math.cos(angulo) * forca
      const dy = Math.sin(angulo) * forca - 60
      const giro = (Math.random() - .5) * 720

      p.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${giro / 2}deg)`, opacity: 1, offset: .55 },
        { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 120}px)) rotate(${giro}deg)`, opacity: 0 }
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => p.remove()
    }
  }

  return { disparar }
}
