import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from './index'
import { Icon } from '../Icon'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'text', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { children: 'Action' },
}

export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Text: Story = { args: { variant: 'text', children: 'En savoir plus' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Supprimer' } }

export const Loading: Story = { args: { loading: true } }
export const Disabled: Story = { args: { disabled: true } }

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Icon name="plus" size={18} />
        Ajouter
      </>
    ),
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['primary', 'secondary', 'ghost', 'text', 'danger'] as const).map((v) => (
        <div key={v} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant={v} size="sm">{v} sm</Button>
          <Button variant={v} size="md">{v} md</Button>
          <Button variant={v} size="lg">{v} lg</Button>
        </div>
      ))}
    </div>
  ),
}
