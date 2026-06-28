/**
 * @jest-environment jsdom
 *
 * Bloc d'accusé de réception d'escalade côté jeune (GUIC-259) : carte dédiée
 * « transmis · référence · attente honnête ».
 */

import { render, screen } from '@testing-library/react'
import { YayeBlocks } from '@/components/yaye/YayeBlocks'
import type { YayeBlock } from '@/lib/ia/blocks'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

it('rend la carte escalade avec titre, message et référence', () => {
  const blocks: YayeBlock[] = [
    {
      kind: 'escalade',
      reference: 'YAYE-AB12CD',
      title: 'Demande transmise à un conseiller',
      message: 'Un membre de l\'équipe CJS va prendre le relais.',
      button: { label: 'Trouver un centre CJS', href: '/centres' },
    },
  ]
  render(<YayeBlocks blocks={blocks} />)

  expect(screen.getByText('Demande transmise à un conseiller')).toBeInTheDocument()
  expect(screen.getByText(/prendre le relais/)).toBeInTheDocument()
  expect(screen.getByText(/Référence : YAYE-AB12CD/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Trouver un centre CJS/i })).toBeInTheDocument()
})
