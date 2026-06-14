import type { Meta, StoryObj } from '@storybook/react'
import { MaCarteBeneficesSection } from './index'

/**
 * `MaCarteBeneficesSection` — grille 2×2 des 4 bénéfices canoniques
 * de la carte CJS (GUIC-398 / Wave 7).
 *
 * Source design : `public/design-v2/centres-web.jsx:422-437`.
 */
const meta: Meta<typeof MaCarteBeneficesSection> = {
  title: 'Centres / MaCarteBeneficesSection',
  component: MaCarteBeneficesSection,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {},
}

export const Custom: Story = {
  args: {
    benefices: [
      {
        titre: 'Identifier',
        description: 'Ton QR personnel pour entrer dans n\'importe quel centre.',
        icon: 'pin',
      },
      {
        titre: 'Pointer',
        description: 'Confirme ta présence en un scan.',
        icon: 'check-circle',
      },
    ],
  },
}
