/**
 * @jest-environment jsdom
 *
 * Corrections a11y / liens (audit Yaye #2) : pas de double région live sur le
 * typing indicator, badge avatar décoratif, CTA d'aide câblé.
 */

import { render, screen } from '@testing-library/react'
import { YayeTypingIndicator } from '@/components/ui/Yaye/YayeTypingIndicator'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeMatchCard } from '@/components/opportunites/YayeMatchCard'

it('le typing indicator ne porte plus de région live (annonce déléguée)', () => {
  render(<YayeTypingIndicator label="Yaye cherche" />)
  expect(screen.getByTestId('yaye-typing')).not.toHaveAttribute('aria-live')
})

it('le badge IA de l\'avatar est décoratif (aria-hidden)', () => {
  render(<YayeAvatar withBadge />)
  expect(screen.getByText('IA')).toHaveAttribute('aria-hidden', 'true')
})

it('le CTA « Yaye m\'aide à postuler » pointe vers la page Yaye (plus de lien mort)', () => {
  render(<YayeMatchCard />)
  expect(screen.getByRole('link', { name: /Yaye m.aide à postuler/i })).toHaveAttribute('href', '/jeune/yaye')
})

it('YayeMatchCard réutilise l\'avatar canonique (identité unifiée)', () => {
  render(<YayeMatchCard />)
  expect(screen.getByRole('img', { name: /Assistant IA/i })).toBeInTheDocument()
})
