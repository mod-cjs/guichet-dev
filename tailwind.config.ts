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
        // Palette officielle CJS
        'cjs-vert':  '#1B7A3D',
        'cjs-vert-clair': '#2EAB58',
        'cjs-or':    '#E5A823',
        'cjs-rouge': '#C8102E',
        'cjs-noir':  '#1A1A1A',
        'cjs-gris':  '#6B7280',
        'cjs-fond':  '#F9FAFB',
      },
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        cjs: '8px',
      },
    },
  },
  plugins: [],
}

export default config
