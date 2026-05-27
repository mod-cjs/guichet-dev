import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Modal } from './index'
import { Button } from '../Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}

export default meta

type Story = StoryObj<typeof Modal>

function Demo({ size, withFooter }: { size: 'sm' | 'md' | 'lg'; withFooter?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ minHeight: 300 }}>
      <Button onClick={() => setOpen(true)}>Ouvrir</Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size={size}
        title={`Modal ${size}`}
        footer={
          withFooter ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={() => setOpen(false)}>Confirmer</Button>
            </>
          ) : undefined
        }
      >
        <p>Contenu de la modal. Taille {size}.</p>
      </Modal>
    </div>
  )
}

export const Small: Story = { render: () => <Demo size="sm" /> }
export const Medium: Story = { render: () => <Demo size="md" /> }
export const Large: Story = { render: () => <Demo size="lg" /> }
export const WithFooterCTAs: Story = { render: () => <Demo size="md" withFooter /> }

export const WithoutHeader: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true)
      return (
        <div style={{ minHeight: 300 }}>
          <Button onClick={() => setOpen(true)}>Ouvrir</Button>
          <Modal isOpen={open} onClose={() => setOpen(false)} size="sm">
            <p>Modal sans header, close button flottant.</p>
          </Modal>
        </div>
      )
    }
    return <Demo />
  },
}
