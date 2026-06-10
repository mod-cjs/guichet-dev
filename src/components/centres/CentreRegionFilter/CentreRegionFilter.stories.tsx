import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { CentreRegionFilter } from './index'

const meta: Meta<typeof CentreRegionFilter> = {
  title: 'Centres/CentreRegionFilter',
  component: CentreRegionFilter,
}
export default meta

type Story = StoryObj<typeof CentreRegionFilter>

const REGIONS = ['Dakar', 'Thies', 'Kaolack', 'Tambacounda', 'Ziguinchor']

export const Default: Story = {
  render: () => {
    const [v, setV] = useState('all')
    return <CentreRegionFilter regions={REGIONS} value={v} onChange={setV} />
  },
}

export const Selected: Story = {
  render: () => {
    const [v, setV] = useState('Dakar')
    return <CentreRegionFilter regions={REGIONS} value={v} onChange={setV} />
  },
}

export const FewRegions: Story = {
  render: () => {
    const [v, setV] = useState('all')
    return <CentreRegionFilter regions={['Dakar', 'Thies']} value={v} onChange={setV} />
  },
}

export const ManyRegions: Story = {
  render: () => {
    const [v, setV] = useState('all')
    return (
      <CentreRegionFilter
        regions={[
          'Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine',
          'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou',
          'Kolda', 'Ziguinchor', 'Sedhiou',
        ]}
        value={v}
        onChange={setV}
      />
    )
  },
}

export const NoRegions: Story = {
  render: () => {
    const [v, setV] = useState('all')
    return <CentreRegionFilter regions={[]} value={v} onChange={setV} />
  },
}
