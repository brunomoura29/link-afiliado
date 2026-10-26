// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'LinkAfiliado',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#121212', media: '(prefers-color-scheme: dark)' }
      ],
      script: [
        {
          // Aplica o tema salvo antes da primeira pintura (evita "piscar" claro→escuro)
          innerHTML: `(function(){try{var t=localStorage.getItem('tema');var d=t?t==='escuro':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          tagPosition: 'head'
        }
      ]
    }
  },

  runtimeConfig: {
    // Só no servidor. Em produção: NUXT_OPENROUTER_API_KEY / NUXT_OPENROUTER_MODELO
    openrouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
    openrouterModelo: process.env.OPENROUTER_MODELO ?? 'anthropic/claude-haiku-5.5',
    // UazAPI (WhatsApp). Em produção: NUXT_UAZAPI_URL / NUXT_UAZAPI_ADMIN_TOKEN
    uazapiUrl: process.env.UAZAPI_URL ?? '',
    uazapiAdminToken: process.env.UAZAPI_ADMIN_TOKEN ?? '',
    // Chave do agendador da fila de envio (header x-fila-segredo). Em produção: NUXT_FILA_SEGREDO
    filaSegredo: process.env.FILA_SEGREDO ?? '',
    // Liga as tarefas agendadas (fila a cada minuto, repetição de hora em hora). Só no
    // servidor de produção: NUXT_FILA_AUTOMATICA=true
    filaAutomatica: process.env.FILA_AUTOMATICA === 'true',
    public: {
      urlBase: '' // NUXT_PUBLIC_URL_BASE em produção (ex.: https://linkafiliado.app)
    }
  },

  // Tarefas agendadas (server/tasks): o app roda como servidor Node sempre ligado (Easypanel).
  // Elas só fazem algo com NUXT_FILA_AUTOMATICA=true. Rodar 1 réplica só do app.
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '* * * * *': ['fila:processar'],
      '7 * * * *': ['ofertas:repetir']
    }
  },

  // Fonte Plus Jakarta Sans (variável, só baixa os pesos/caracteres usados)
  css: ['@fontsource-variable/plus-jakarta-sans'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css'
  },

  // Só o painel exige login; /login, /cadastro, /f/<token>, /g/<slug> e /amostra são públicos.
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/login', // sem confirmação de e-mail, não há callback de verdade
      include: ['/painel', '/painel/*'],
      saveRedirectToCookie: true
    }
  }
})
