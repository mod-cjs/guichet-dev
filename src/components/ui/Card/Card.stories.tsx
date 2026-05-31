import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card } from './index'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['default', 'opportunite', 'candidature', 'mycard'] },
    padded: { control: 'boolean' },
    elevated: { control: 'boolean' },
  },
  args: { children: 'Contenu de la carte', variant: 'default', padded: true, elevated: false },
}

export default meta

type Story = StoryObj<typeof Card>

export const Default: Story = {}

export const NotPadded: Story = {
  args: { padded: false, children: 'Contenu sans padding interne' },
}

export const Elevated: Story = {
  args: { elevated: true, children: 'Carte avec shadow-gj-md' },
}

export const Opportunite: Story = {
  args: {
    variant: 'opportunite',
    children: (
      <>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Stage agronomie</h3>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: '4px 0 0' }}>
          Tambacounda · 180 000 F · 3 mois
        </p>
      </>
    ),
  },
}

export const Candidature: Story = {
  args: {
    variant: 'candidature',
    header: <strong>Stage agronomie — En revue</strong>,
    footer: <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Mise à jour il y a 2 jours</span>,
    children: <p style={{ margin: 0, fontSize: 14 }}>Étape 3 / 5 — Le recruteur consulte ton dossier.</p>,
  },
}

export const MyCard: Story = {
  args: {
    variant: 'mycard',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: '.4px', textTransform: 'uppercase' }}>
          Ma carte CJS
        </span>
        <strong style={{ fontSize: 20 }}>Awa Diop</strong>
        <span style={{ fontSize: 12, opacity: 0.85 }}>cjs-uid · ••• 9F4C</span>
      </div>
    ),
  },
}

export const WithHeaderFooter: Story = {
  args: {
    header: <strong>Titre de section</strong>,
    footer: <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>Pied de carte</span>,
    children: <p style={{ margin: 0 }}>Contenu principal de la carte.</p>,
  },
}
