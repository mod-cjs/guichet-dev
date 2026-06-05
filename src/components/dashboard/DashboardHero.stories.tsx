import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardHero } from './DashboardHero'

const meta: Meta<typeof DashboardHero> = {
  title: 'Dashboard/DashboardHero',
  component: DashboardHero,
  args: {
    prenom: 'Awa',
    nom: 'Diop',
    programme: 'Programme YEAH',
  },
}

export default meta
type Story = StoryObj<typeof DashboardHero>

export const Default: Story = {}

export const SansProgramme: Story = {
  args: { programme: undefined },
}

export const AvecPhoto: Story = {
  args: { photoUrl: 'https://i.pravatar.cc/200?img=47' },
}

export const NomLong: Story = {
  args: { prenom: 'Maïmouna-Aïssatou', nom: 'Ndiaye Mbengue' },
}
