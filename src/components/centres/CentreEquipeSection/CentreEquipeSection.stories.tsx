import type { Meta, StoryObj } from '@storybook/react'
import { CentreEquipeSection } from './index'

const meta: Meta<typeof CentreEquipeSection> = {
  title: 'centres/CentreEquipeSection',
  component: CentreEquipeSection,
}
export default meta
type Story = StoryObj<typeof CentreEquipeSection>

export const Liste: Story = {
  args: {
    agents: [
      {
        id: '1',
        prenom: 'Awa',
        nom: 'Diop',
        email: 'awa.diop@cjs.sn',
        telephone: '+221771234567',
        role: 'directeur',
        photoUrl: null,
        domainesExpertise: ['Orientation', 'Mentorat'],
      },
      {
        id: '2',
        prenom: 'Modou',
        nom: 'Fall',
        email: 'modou.fall@cjs.sn',
        telephone: null,
        role: 'conseiller',
        photoUrl: null,
        domainesExpertise: ['Entrepreneuriat'],
      },
      {
        id: '3',
        prenom: 'Fatou',
        nom: 'Sow',
        email: null,
        telephone: '+221771234999',
        role: 'conseiller',
        photoUrl: null,
        domainesExpertise: [],
      },
    ],
  },
}

export const Vide: Story = {
  args: { agents: [] },
}
