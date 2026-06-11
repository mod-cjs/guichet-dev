import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { JustificatifUpload } from './index'

const meta: Meta<typeof JustificatifUpload> = {
  title: 'centres/JustificatifUpload',
  component: JustificatifUpload,
}
export default meta
type Story = StoryObj<typeof JustificatifUpload>

export const Optional: Story = {
  render: () => {
    const [f, setF] = useState<File | null>(null)
    return <JustificatifUpload file={f} onChange={setF} />
  },
}

export const Required: Story = {
  render: () => {
    const [f, setF] = useState<File | null>(null)
    return <JustificatifUpload required file={f} onChange={setF} />
  },
}
