// Tarefa agendada (nuxt.config → nitro.scheduledTasks, a cada minuto): uma rodada da fila
// de envio. Só roda com NUXT_FILA_AUTOMATICA=true (no servidor de produção), para o app
// rodando no computador de alguém não mandar ofertas para grupos reais.
let rodando = false

export default defineTask({
  meta: { name: 'fila:processar', description: 'Manda o próximo envio de cada número, se já der' },
  // payload.forcar: rodar à mão em teste (POST /_nitro/tasks/<nome>, que só existe em dev)
  async run({ payload }) {
    if (!useRuntimeConfig().filaAutomatica && !(import.meta.dev && payload?.forcar)) return { result: 'desligada' }
    if (rodando) return { result: 'rodada anterior ainda em andamento' }
    rodando = true
    try {
      return { result: await processarFila(supabaseAdmin()) }
    } finally {
      rodando = false
    }
  }
})
