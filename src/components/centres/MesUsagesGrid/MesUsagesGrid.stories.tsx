import type { Meta, StoryObj } from '@storybook/react'
import { MesUsagesGrid } from './index'
import type { UsageCarteCJS } from '@/lib/loaders/centres'

const meta: Meta<typeof MesUsagesGrid> = {
  title: 'Centres/MesUsagesGrid',
  component: MesUsagesGrid,
}
export default meta

type Story = StoryObj<typeof MesUsagesGrid>

const sample: UsageCarteCJS[] = [
  {
    type: 'reservation',
    id: 'r1',
    centreNom: 'CJS Dakar',
    centreSlug: 'cjs-dakar',
    ressourceNom: 'Salle A',
    date: new Date(Date.now() - 86400_000).toISOString(),
    statut: 'Acceptee',
  },
  {
    type: 'checkin',
    id: 'c1',
    centreNom: 'CJS Thiès',
    centreSlug: 'cjs-thies',
    ressourceNom: null,
    date: new Date(Date.now() - 3 * 86400_000).toISOString(),
    statut: 'QrCard',
  },
  {
    type: 'reservation',
    id: 'r2',
    centreNom: 'CJS Saint-Louis',
    centreSlug: 'cjs-saint-louis',
    ressourceNom: 'Poste info 3',
    date: new Date(Date.now() - 7 * 86400_000).toISOString(),
    statut: 'Passee',
  },
]

export const Plein: Story = { args: { usages: sample } }
export const Vide: Story = { args: { usages: [] } }
