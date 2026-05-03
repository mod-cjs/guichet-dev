import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens GJ — mappés sur les variables CSS de tokens.css
        'gj-teal':        'var(--gj-teal)',
        'gj-teal-deep':   'var(--gj-teal-deep)',
        'gj-teal-soft':   'var(--gj-teal-soft)',
        'gj-yellow':      'var(--gj-yellow)',
        'gj-yellow-soft': 'var(--gj-yellow-soft)',
        'gj-yellow-ink':  'var(--gj-yellow-ink)',
        'gj-red':         'var(--gj-red)',
        'gj-red-soft':    'var(--gj-red-soft)',
        'gj-red-ink':     'var(--gj-red-ink)',
        'gj-blue':        'var(--gj-blue)',
        'gj-blue-soft':   'var(--gj-blue-soft)',
        'gj-green':       'var(--gj-green)',
        'gj-green-soft':  'var(--gj-green-soft)',
        'gj-ink':         'var(--gj-ink)',
        'gj-grey':        'var(--gj-grey)',
        'gj-grey-2':      'var(--gj-grey-2)',
        'gj-line':        'var(--gj-line)',
        'gj-line-strong': 'var(--gj-line-strong)',
        'gj-bg':          'var(--gj-bg)',
        'gj-surface':     'var(--gj-surface)',
        'gj-indigo':      'var(--gj-indigo)',
        'gj-indigo-soft': 'var(--gj-indigo-soft)',
        'gj-whatsapp':    'var(--gj-whatsapp)',
        // Aliases de compatibilité (ancien naming CJS)
        'cjs-vert':       'var(--gj-teal)',
        'cjs-vert-clair': 'var(--gj-teal-deep)',
        'cjs-or':         'var(--gj-yellow)',
        'cjs-rouge':      'var(--gj-red)',
        'cjs-noir':       'var(--gj-ink)',
        'cjs-gris':       'var(--gj-grey)',
        'cjs-fond':       'var(--gj-bg)',
      },
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        cjs: '8px',
      },
      spacing: {
        'tap':    'var(--tap-min)',
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
        'space-7': 'var(--space-7)',
        'space-8': 'var(--space-8)',
      },
      boxShadow: {
        'gj-sm': 'var(--gj-shadow-sm)',
        'gj-md': 'var(--gj-shadow-md)',
        'gj-lg': 'var(--gj-shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
