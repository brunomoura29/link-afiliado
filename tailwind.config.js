/** @type {import('tailwindcss').Config} */

// Cores vêm de variáveis CSS (canais RGB) definidas em app/assets/css/main.css,
// para trocar de tema claro/escuro sem duplicar classes.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./app/**/*.{vue,js,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // Pela altura: notebooks com tela baixa (ex.: 1366x600 útil)
        baixa: { raw: '(max-height: 760px)' },
        ampla: { raw: '(min-width: 1440px) and (min-height: 820px)' }
      },
      fontFamily: {
        // Plus Jakarta Sans servida pelo próprio app (@fontsource-variable), com fallback do sistema
        sans: [
          '"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui',
          '-apple-system', '"Segoe UI"', 'Arial', 'sans-serif',
          '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'
        ]
      },
      fontSize: {
        label: ['14px', { lineHeight: '21px' }],
        body: ['16px', { lineHeight: '24px' }],
        title: ['20px', { lineHeight: '28px', fontWeight: '600' }]
      },
      colors: {
        fg: v('fg'),
        muted: v('muted'),
        line: v('line'),
        bg: v('bg'),
        surface: v('surface'),
        elevated: v('elevated'),
        shopee: { DEFAULT: v('shopee'), tint: v('shopee-tint') },
        ml: { yellow: v('ml-yellow'), blue: v('ml-blue'), tint: v('ml-tint') },
        whatsapp: v('whatsapp'),
        status: {
          pendente: v('status-pendente'),
          aprovada: v('status-aprovada'),
          rejeitada: v('status-rejeitada'),
          enviada: v('whatsapp')
        }
      },
      borderRadius: {
        DEFAULT: '8px'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)'
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34, 1.56, .64, 1)',
        out: 'cubic-bezier(.22, 1, .36, 1)'
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' }
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' }
        },
        scan: {
          '0%, 100%': { top: '6%' },
          '50%': { top: '90%' }
        },
        draw: {
          from: { strokeDashoffset: '24' },
          to: { strokeDashoffset: '0' }
        },
        'ring-out': {
          from: { transform: 'scale(.8)', opacity: '.6' },
          to: { transform: 'scale(2.2)', opacity: '0' }
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        bounce3: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' }
        }
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,1,.36,1) both',
        pop: 'pop .45s cubic-bezier(.34,1.56,.64,1) both',
        shake: 'shake .4s ease-in-out',
        shimmer: 'shimmer 1.6s linear infinite',
        scan: 'scan 2.4s ease-in-out infinite',
        draw: 'draw .4s cubic-bezier(.22,1,.36,1) .1s both',
        'ring-out': 'ring-out 1.6s cubic-bezier(.22,1,.36,1) infinite',
        blink: 'blink 1s step-end infinite',
        bounce3: 'bounce3 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
