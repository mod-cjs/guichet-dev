import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YayeBubble } from './index'

const meta: Meta<typeof YayeBubble> = {
  title: 'UI/Yaye/YayeBubble',
  component: YayeBubble,
  argTypes: {
    from: { control: { type: 'inline-radio' }, options: ['bot', 'user'] },
  },
  args: { from: 'bot', children: 'Salama Awa. Comment puis-je t\'aider aujourd\'hui ?' },
}

export default meta

type Story = StoryObj<typeof YayeBubble>

export const Bot: Story = {}
export const User: Story = { args: { from: 'user', children: 'Trouve-moi un stage en agro près de chez moi.' } }
export const WithTimestamp: Story = { args: { timestamp: '9:41' } }

export const Conversation: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#F5FAF8', padding: 16, borderRadius: 14 }}>
      <YayeBubble from="bot" timestamp="9:41">
        Salama Awa. J&apos;ai 3 opportunités à 90%+ match pour toi à Tambacounda.
      </YayeBubble>
      <YayeBubble from="user" timestamp="9:42">
        Trouve-moi un stage en agro, près de chez moi, payé.
      </YayeBubble>
      <YayeBubble from="bot">
        Reçu. J&apos;ai filtré 247 offres → 2 collent vraiment. Je te montre ?
      </YayeBubble>
      <YayeBubble from="user">Oui</YayeBubble>
    </div>
  ),
}
