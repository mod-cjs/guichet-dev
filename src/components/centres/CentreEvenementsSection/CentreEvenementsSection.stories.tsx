import type { Meta, StoryObj } from '@storybook/react'
import { CentreEvenementsSection } from './index'

const meta: Meta<typeof CentreEvenementsSection> = {
  title: 'centres/CentreEvenementsSection',
  component: CentreEvenementsSection,
}
export default meta
type Story = StoryObj<typeof CentreEvenementsSection>

export const Liste: Story = {
  args: {
    centreSlug: 'cjs-tambacounda',
    evenements: [
      {
        id: 'e1',
        titre: 'Atelier CV pour stages 2026',
        type: 'Atelier',
        dateDebut: '2026-07-12T09:00:00Z',
        dateFin: '2026-07-12T12:00:00Z',
        lieu: 'CJS Tambacounda — Salle A',
      },
      {
        id: 'e2',
        titre: 'Formation entrepreneuriat agricole',
        type: 'Formation',
        dateDebut: '2026-07-20T08:00:00Z',
        dateFin: null,
        lieu: 'CJS Tambacounda',
      },
    ],
  },
}

export const Vide: Story = {
  args: { centreSlug: 'cjs-tambacounda', evenements: [] },
}
