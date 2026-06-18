import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Sheet } from './index'
import { Button } from '../Button'

const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
}

export default meta

type Story = StoryObj<typeof Sheet>

export const BottomFiltres: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true)
      return (
        <div style={{ minHeight: 400 }}>
          <Button onClick={() => setOpen(true)}>Ouvrir filtres</Button>
          <Sheet isOpen={open} onClose={() => setOpen(false)} variant="bottom" title="Filtres">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>Région</label>
              <select style={{ padding: 12, border: '1.5px solid var(--gj-line)', borderRadius: 8 }}>
                <option>Dakar</option>
                <option>Tambacounda</option>
              </select>
              <label>Domaine</label>
              <select style={{ padding: 12, border: '1.5px solid var(--gj-line)', borderRadius: 8 }}>
                <option>Agriculture</option>
                <option>Numérique</option>
              </select>
              <Button onClick={() => setOpen(false)}>Appliquer</Button>
            </div>
          </Sheet>
        </div>
      )
    }
    return <Demo />
  },
}

export const SideOpportuniteDetail: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true)
      return (
        <div style={{ minHeight: 400 }}>
          <Button onClick={() => setOpen(true)}>Voir détail</Button>
          <Sheet isOpen={open} onClose={() => setOpen(false)} variant="side" title="Stage agronomie">
            <p>180 000 F · Tambacounda · 3 mois</p>
            <p style={{ color: 'var(--gj-grey)' }}>
              Description complète de l&apos;opportunité. Plusieurs paragraphes pour démontrer le scroll.
            </p>
            <Button>Candidater</Button>
          </Sheet>
        </div>
      )
    }
    return <Demo />
  },
}

/**
 * GUIC-417 — slide-over droit pleine hauteur sur desktop (100dvh).
 * Sur mobile (< 768px), le composant retombe en bottom-sheet limité à
 * `maxHeightPct%` (94 par défaut).
 */
export const SidePleineHauteurDesktop: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true)
      return (
        <div style={{ minHeight: 600 }}>
          <Button onClick={() => setOpen(true)}>Ouvrir détail</Button>
          <Sheet isOpen={open} onClose={() => setOpen(false)} variant="side" title="Détail opportunité">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p>Slide-over droit, pleine hauteur sur desktop (md+).</p>
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i} style={{ color: 'var(--gj-grey)' }}>
                  Paragraphe {i + 1} — le panel occupe 100dvh et le contenu défile.
                </p>
              ))}
            </div>
          </Sheet>
        </div>
      )
    }
    return <Demo />
  },
}
