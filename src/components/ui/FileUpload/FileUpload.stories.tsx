import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FileUpload } from './index'

const meta: Meta<typeof FileUpload> = {
  title: 'UI/FileUpload',
  component: FileUpload,
}

export default meta

type Story = StoryObj<typeof FileUpload>

const fakeUpload = async (safeName: string, file: File) => {
  // Simule un upload lent (800 ms) — utile pour voir la progressbar.
  await new Promise((r) => setTimeout(r, 800))
  return {
    url: `https://blob.example/${encodeURIComponent(safeName)}`,
    name: safeName,
    sizeKb: Math.round(file.size / 1024),
  }
}

export const Default: Story = {
  args: {
    label: 'CV',
    upload: fakeUpload,
  },
}

export const Disabled: Story = {
  args: {
    label: 'CV',
    upload: fakeUpload,
    disabled: true,
  },
}
