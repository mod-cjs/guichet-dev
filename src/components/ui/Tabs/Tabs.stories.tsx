import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Tabs } from './index'

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof Tabs>

const ITEMS = [
  { value: 'all', label: 'Toutes', count: 132 },
  { value: 'emploi', label: 'Emplois', count: 24 },
  { value: 'stage', label: 'Stages', count: 18 },
  { value: 'formation', label: 'Formations', count: 41 },
  { value: 'bourse', label: 'Bourses', count: 12 },
  { value: 'volontariat', label: 'Volontariat', count: 9 },
  { value: 'appel', label: 'Appels à projets', count: 28 },
]

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('all')
    return (
      <Tabs
        value={value}
        onChange={setValue}
        items={ITEMS}
        ariaLabel="Filtrer par type d'opportunité"
      />
    )
  },
}

export const SansCompteurs: Story = {
  render: () => {
    const [value, setValue] = useState('emploi')
    return (
      <Tabs
        value={value}
        onChange={setValue}
        items={ITEMS.map(({ count: _c, ...rest }) => rest)}
        ariaLabel="Filtrer par type"
      />
    )
  },
}

export const AvecZero: Story = {
  render: () => {
    const [value, setValue] = useState('all')
    return (
      <Tabs
        value={value}
        onChange={setValue}
        items={[
          { value: 'all', label: 'Toutes', count: 5 },
          { value: 'emploi', label: 'Emplois', count: 5 },
          { value: 'stage', label: 'Stages', count: 0 },
          { value: 'bourse', label: 'Bourses', count: 0 },
        ]}
        ariaLabel="Filtrer par type"
      />
    )
  },
}
