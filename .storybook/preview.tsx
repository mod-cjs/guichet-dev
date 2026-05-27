import type { Preview } from '@storybook/nextjs'
import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' = avertit dans le panel, ne fait pas échouer.
      // À passer en 'error' quand le design system v2 sera stabilisé.
      test: 'todo',
    },
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page', value: '#F5F7F6' },
        { name: 'surface', value: '#FFFFFF' },
        { name: 'ink', value: '#0A2820' },
      ],
    },
  },
}

export default preview
