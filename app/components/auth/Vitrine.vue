<script setup lang="ts">
// Lado esquerdo do login/cadastro: mostra a solução funcionando.
// Fundo sempre escuro (nos dois temas), por isso as cores são fixas aqui.
const PASSOS = [
  { icone: 'link', titulo: 'Cole o link', texto: 'Você ou seu assistente cola o link de afiliado.' },
  { icone: 'brilho', titulo: 'A IA escreve', texto: 'Legenda pronta com o preço lido da página do produto.' },
  { icone: 'enviar', titulo: 'Vai pros grupos', texto: 'Envio automático, com intervalo seguro.' }
] as const

const OFERTAS = [
  { emoji: '🍳', texto: '🔥 Achado do dia! Air fryer 4L de R$ 449 por', preco: 'R$ 299,00', desconto: 33, link: 'meli.la/3kQz7' },
  { emoji: '🎧', texto: 'Olha esse preço 👀 Fone Bluetooth com cancelamento de ruído por', preco: 'R$ 129,90', desconto: 35, link: 's.shopee.com.br/8Ab' },
  { emoji: '🫙', texto: 'Corre que tá barato! Kit 6 potes de vidro com tampa bambu por', preco: 'R$ 54,90', desconto: 39, link: 'amzn.to/3xKp9Qa' },
  { emoji: '🍲', texto: 'Promoção relâmpago ⚡ Jogo de panelas 5 peças por', preco: 'R$ 189,90', desconto: 42, link: 'meli.la/9Lp2c' }
]

const passo = ref(0)
const mensagens = ref<{ id: number, oferta: typeof OFERTAS[number], hora: string }[]>([])
let seq = 0
let timer: ReturnType<typeof setInterval> | undefined

function proxima() {
  const oferta = OFERTAS[seq % OFERTAS.length]!
  const agora = new Date()
  mensagens.value.push({ id: seq++, oferta, hora: `${agora.getHours()}:${String(agora.getMinutes()).padStart(2, '0')}` })
  if (mensagens.value.length > 2) mensagens.value.shift()
}

onMounted(() => {
  proxima()
  timer = setInterval(() => {
    passo.value = (passo.value + 1) % PASSOS.length
    if (passo.value === 0) proxima()
  }, 1600)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="relative flex min-h-full flex-col justify-between gap-10 p-10 xl:p-14 baixa:gap-6 baixa:py-7">
    <!-- Brilho -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="brilho absolute -left-24 top-1/3 size-[480px] rounded-full bg-[#25d366]/20 blur-3xl" />
    </div>

    <Logo claro class="relative" />

    <div class="relative grid items-center gap-10 ampla:grid-cols-[1fr_300px]">
      <div>
        <h2 class="max-w-lg text-[32px] font-semibold leading-10 tracking-tight baixa:text-[28px] baixa:leading-9 ampla:text-[40px] ampla:leading-[48px]">
          Suas ofertas no WhatsApp,
          <span class="text-[#25d366]">no piloto automático.</span>
        </h2>
        <p class="mt-4 max-w-md text-white/60 baixa:mt-3">
          Cole o link de afiliado de qualquer loja: Shopee, Mercado Livre, Amazon, TikTok Shop…
          O resto a gente faz: lê o produto, escreve a legenda e envia nos seus grupos.
        </p>

        <ol class="mt-8 flex max-w-md flex-col gap-2 baixa:mt-5 baixa:gap-1">
          <li
            v-for="(p, i) in PASSOS"
            :key="p.titulo"
            class="flex items-center gap-4 rounded-lg border p-3 transition-[background-color,border-color] duration-500 baixa:py-2"
            :class="passo === i ? 'border-white/15 bg-white/[.07]' : 'border-transparent'"
          >
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-500 ease-spring"
              :class="passo === i ? 'scale-110 bg-[#25d366] text-[#0b3d1f]' : 'bg-white/10 text-white/70'"
            >
              <UiIcone :nome="p.icone" :tamanho="18" />
            </span>
            <span>
              <span class="block font-semibold">{{ p.titulo }}</span>
              <span class="block text-label text-white/55 baixa:hidden">{{ p.texto }}</span>
            </span>
          </li>
        </ol>
      </div>

      <!-- Prévia de um grupo recebendo ofertas -->
      <div class="hidden rounded-[22px] border border-white/10 bg-[#161616] p-2 shadow-2xl ampla:block">
        <div class="flex items-center gap-3 rounded-t-[16px] bg-white/[.04] px-3 py-2.5">
          <span class="flex size-9 items-center justify-center rounded-full bg-white/10 text-[18px]">🏠</span>
          <span class="min-w-0">
            <span class="block truncate text-label font-semibold">Achadinhos Casa</span>
            <span class="block text-[12px] text-white/50">1.847 membros</span>
          </span>
        </div>
        <TransitionGroup
          tag="div"
          name="msg"
          class="relative flex h-[420px] flex-col justify-end gap-2 overflow-hidden px-2 py-3 [mask-image:linear-gradient(to_bottom,transparent,black_64px)]"
        >
          <div
            v-for="m in mensagens"
            :key="m.id"
            class="w-[92%] rounded-xl rounded-tl-sm bg-[#1f2c22] p-2 text-[13px] leading-[18px]"
          >
            <div class="relative mb-2 flex h-20 items-center justify-center rounded-lg bg-white/[.06] text-[34px]">
              {{ m.oferta.emoji }}
              <span class="absolute right-1.5 top-1.5 rounded-full bg-white px-1.5 text-[11px] font-semibold text-[#0d0d0d]">-{{ m.oferta.desconto }}%</span>
            </div>
            <p class="text-white/90">
              {{ m.oferta.texto }} <strong class="text-white">{{ m.oferta.preco }}</strong>
            </p>
            <p class="mt-1 truncate text-[#53bdeb]">{{ m.oferta.link }}</p>
            <p class="mt-0.5 text-right text-[11px] text-white/40">{{ m.hora }} ✓✓</p>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <ul class="relative flex flex-wrap gap-x-6 gap-y-2 text-label text-white/55 baixa:hidden">
      <li class="flex items-center gap-2"><UiIcone nome="check" :tamanho="16" class="text-[#25d366]" /> Qualquer programa de afiliados</li>
      <li class="flex items-center gap-2"><UiIcone nome="check" :tamanho="16" class="text-[#25d366]" /> Legenda com IA</li>
      <li class="flex items-center gap-2"><UiIcone nome="check" :tamanho="16" class="text-[#25d366]" /> Feito para usar no celular</li>
    </ul>
  </div>
</template>

<style scoped>
.brilho { animation: respirar 7s ease-in-out infinite; }
@keyframes respirar {
  0%, 100% { opacity: .6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.12) translate(20px, -10px); }
}
.msg-enter-active { transition: opacity .4s ease, transform .55s cubic-bezier(.34, 1.56, .64, 1); }
.msg-leave-active { transition: opacity .3s ease, transform .4s ease; position: absolute; }
.msg-enter-from { opacity: 0; transform: translateY(24px) scale(.94); }
.msg-leave-to { opacity: 0; transform: translateY(-24px); }
.msg-move { transition: transform .5s cubic-bezier(.22, 1, .36, 1); }
</style>
