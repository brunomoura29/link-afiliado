import type { Directive } from 'vue'

// v-reveal / v-reveal="120" (atraso em ms): entra com fade ao aparecer na tela.
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null

  const reveal: Directive<HTMLElement, number | undefined> = {
    getSSRProps: () => ({ class: 'reveal' }),
    mounted(el, binding) {
      el.classList.add('reveal')
      if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
      observer ??= new IntersectionObserver((entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            observer?.unobserve(e.target)
          }
        }
      // Aparece quando o topo entra um pouco na tela. Não usar threshold em %: um bloco
      // mais alto que a tela (ex.: lista com 182 grupos) nunca atingiria e ficaria invisível.
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' })
      observer.observe(el)
    },
    unmounted(el) {
      observer?.unobserve(el)
    }
  }

  nuxtApp.vueApp.directive('reveal', reveal)
})
