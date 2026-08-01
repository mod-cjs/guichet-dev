import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { OfflineBanner } from './index'

/**
 * `OfflineBanner` ne se rend que lorsque `useOnlineStatus()` détecte l'état
 * hors-ligne. La story force `navigator.onLine` à `false` avant le montage
 * pour démontrer le rendu réel du composant (et non une reconstitution
 * visuelle séparée).
 */
const meta: Meta<typeof OfflineBanner> = {
  title: 'UI/OfflineBanner',
  component: OfflineBanner,
}

export default meta

type Story = StoryObj<typeof OfflineBanner>

export const HorsLigne: Story = {
  decorators: [
    (Story) => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
      return <Story />
    },
  ],
}

export const EnLigne: Story = {
  decorators: [
    (Story) => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
      return <Story />
    },
  ],
  parameters: {
    docs: { description: { story: 'En ligne, le composant ne rend rien (le canvas Storybook reste vide, comportement attendu).' } },
  },
}
