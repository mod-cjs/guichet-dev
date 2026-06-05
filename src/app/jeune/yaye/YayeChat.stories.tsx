import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeChat } from './YayeChat'

const meta: Meta<typeof YayeChat> = {
  title: 'Pages/Jeune/YayeFullscreen',
  component: YayeChat,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'iphone14' },
  },
}

export default meta

type Story = StoryObj<typeof YayeChat>

export const Default: Story = {}
