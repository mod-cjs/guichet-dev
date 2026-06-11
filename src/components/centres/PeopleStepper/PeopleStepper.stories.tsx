import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { PeopleStepper } from './index'

const meta: Meta<typeof PeopleStepper> = {
  title: 'centres/PeopleStepper',
  component: PeopleStepper,
}
export default meta
type Story = StoryObj<typeof PeopleStepper>

export const Default: Story = {
  render: () => {
    const [n, setN] = useState(1)
    return (
      <div style={{ maxWidth: 240 }}>
        <PeopleStepper value={n} max={8} unit="pers." onChange={setN} />
      </div>
    )
  },
}
