import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Switch } from './index'

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  args: { checked: false, 'aria-label': 'Contraste élevé', onChange: () => {} },
}

export default meta

type Story = StoryObj<typeof Switch>

export const Off: Story = {}

export const On: Story = {
  args: { checked: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const DisabledOn: Story = {
  args: { disabled: true, checked: true },
}

/** Usage réel — ligne de réglage de la page Inclusion & accessibilité. */
export const Interactive: Story = {
  render: () => {
    const Demo = () => {
      const [on, setOn] = useState(false)
      return (
        <div className="flex items-center gap-3 max-w-[320px]">
          <span className="flex-1 text-fs-300 font-bold text-gj-ink">
            Contraste élevé
          </span>
          <Switch checked={on} onChange={setOn} aria-label="Contraste élevé" />
        </div>
      )
    }
    return <Demo />
  },
}
