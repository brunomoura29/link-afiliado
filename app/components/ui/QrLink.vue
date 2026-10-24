<script setup lang="ts">
import { renderSVG } from 'uqr'

// QR code real de um link (para posts e stories), com download em PNG.
const props = defineProps<{ url: string, nomeArquivo?: string }>()

const svg = computed(() => renderSVG(props.url, { ecc: 'M', border: 2, pixelSize: 10, blackColor: '#0d0d0d', whiteColor: '#ffffff' }))

async function baixarPng() {
  const tamanho = 1080 // bom para stories/posts
  const img = new Image()
  // Sem width/height o navegador pode assumir 300x150 e distorcer
  const comTamanho = svg.value.replace('<svg ', `<svg width="${tamanho}" height="${tamanho}" `)
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(comTamanho)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = tamanho
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, tamanho, tamanho)
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `${props.nomeArquivo ?? 'qr-code'}.png`
  a.click()
}

defineExpose({ baixarPng })
</script>

<template>
  <div class="qr aspect-square w-full overflow-hidden rounded-lg border border-line bg-white" v-html="svg" />
</template>

<style scoped>
.qr :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
