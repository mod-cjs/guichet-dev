import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageHeader } from './index'
import { Button } from '../Button'

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
}

export default meta

type Story = StoryObj<typeof PageHeader>

export const TitreSeul: Story = {
  args: { title: 'Mes favoris' },
}

export const AvecSubtitle: Story = {
  args: {
    title: 'Mes favoris',
    subtitle: 'Les opportunités que vous avez sauvegardées',
  },
}

export const AvecActions: Story = {
  args: {
    title: 'Mes candidatures',
    subtitle: 'Suivi de vos candidatures aux opportunités',
    actions: <Button size="sm">Nouvelle candidature</Button>,
  },
}
