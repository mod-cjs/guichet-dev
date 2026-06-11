import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RessourceTypeFilter, type RessourceTypeValue } from './index'

const meta: Meta<typeof RessourceTypeFilter> = {
  title: 'centres/RessourceTypeFilter',
  component: RessourceTypeFilter,
}
export default meta
type Story = StoryObj<typeof RessourceTypeFilter>

export const Default: Story = {
  render: () => {
    const [v, setV] = useState<RessourceTypeValue>('Toutes')
    return (
      <RessourceTypeFilter
        value={v}
        onChange={setV}
        counts={{ Salle: 3, Vehicule: 1, Poste_info: 6 }}
      />
    )
  },
}
