<script setup lang="ts">
const { toasts, fechar } = useToast()
</script>

<template>
  <div
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto flex w-full max-w-md flex-col px-4 pt-[max(16px,env(safe-area-inset-top))]
           sm:right-4 sm:left-auto sm:mx-0 sm:px-0"
  >
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast-casca">
        <div class="min-h-0">
          <div class="pb-3">
            <UiToastItem :toast="t" @fechar="fechar(t.id)" />
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Grid 1fr→0fr colapsa a altura suavemente quando um toast sai */
.toast-casca {
  display: grid;
  grid-template-rows: 1fr;
}
.toast-enter-active {
  transition: grid-template-rows .45s cubic-bezier(.22, 1, .36, 1), opacity .3s ease, transform .5s cubic-bezier(.34, 1.56, .64, 1);
}
.toast-leave-active {
  transition: grid-template-rows .3s cubic-bezier(.22, 1, .36, 1) .08s, opacity .2s ease, transform .3s ease;
}
.toast-enter-from {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-24px) scale(.92);
}
.toast-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: scale(.92);
}
</style>
