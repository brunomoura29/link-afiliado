// Tarefa agendada (de hora em hora): põe na fila a próxima rodada das ofertas que repetem.
// Mesma trava da fila: só com NUXT_FILA_AUTOMATICA=true.
let rodando = false

export default defineTask({
  meta: { name: 'ofertas:repetir', description: 'Repete as ofertas com a próxima rodada vencida' },
  // payload.forcar: rodar à mão em teste (POST /_nitro/tasks/<nome>, que só existe em dev)
  async run({ payload }) {
    if (!useRuntimeConfig().filaAutomatica && !(import.meta.dev && payload?.forcar)) return { result: 'desligada' }
    if (rodando) return { result: 'rodada anterior ainda em andamento' }
    rodando = true
    try {
      return { result: await repetirVencidas(supabaseAdmin()) }
    } finally {
      rodando = false
    }
  }
})
