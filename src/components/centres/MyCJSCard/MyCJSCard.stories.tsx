import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MyCJSCard, type MyCJSCardUser } from './index'

const SAMPLE_USER: MyCJSCardUser = {
  prenom: 'Awa',
  nom: 'Diallo',
  matricule: 'GJS · AD · 23045',
  centrePrincipal: { nom: 'CJS Tambacounda', region: 'Tambacounda' },
  membreDepuis: '03/2025',
}

const meta: Meta<typeof MyCJSCard> = {
  title: 'Centres/MyCJSCard',
  component: MyCJSCard,
  tags: ['centres', 'lot7'],
  args: {
    user: SAMPLE_USER,
    qrUrl: 'https://guichetjeunesse.sn/checkin/v1/demo-token-abc123',
  },
}

export default meta

type Story = StoryObj<typeof MyCJSCard>

export const Recto: Story = {}

export const RectoAvecPhoto: Story = {
  args: {
    user: { ...SAMPLE_USER, photoUrl: 'https://i.pravatar.cc/120?img=47' },
  },
}

export const RectoSansQR: Story = {
  args: { qrUrl: undefined },
}

export const Compact: Story = {
  args: { compact: true },
}

export const Verso: Story = {
  args: { variant: 'verso' },
}

export const RectoEtVerso: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
      <MyCJSCard {...args} variant="recto" />
      <MyCJSCard {...args} variant="verso" />
    </div>
  ),
}
