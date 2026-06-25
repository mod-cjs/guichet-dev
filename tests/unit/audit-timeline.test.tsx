/**
 * G3 — AuditTimeline (rendu read-only du journal d'audit).
 */
import { render, screen } from '@testing-library/react'
import { AuditTimeline, type AuditRow } from '@/app/admin/journal-audit/AuditTimeline'

const ROWS: AuditRow[] = [
  {
    id: '1', actor: 'Khady Ndiaye', actionText: 'a approuvé une publication',
    targetText: '(réf. abc123…)', when: '25 juin 2026, 10:00', tone: 'green', icon: 'check',
  },
  {
    id: '2', actor: 'Modou Fall', actionText: 'a consulté une fiche bénéficiaire',
    targetText: 'sur la fiche de Awa Diop', when: '25 juin 2026, 09:30', tone: 'grey', icon: 'eye',
  },
]

describe('AuditTimeline', () => {
  it('rend chaque événement avec acteur + action + cible', () => {
    render(<AuditTimeline rows={ROWS} total={2} />)
    expect(screen.getByText('Khady Ndiaye')).toBeInTheDocument()
    expect(screen.getByText(/a approuvé une publication/)).toBeInTheDocument()
    expect(screen.getByText('Modou Fall')).toBeInTheDocument()
    expect(screen.getByText(/sur la fiche de Awa Diop/)).toBeInTheDocument()
  })

  it('affiche un état vide explicite quand aucun événement', () => {
    render(<AuditTimeline rows={[]} total={0} />)
    expect(screen.getByText(/Aucun événement d.audit/i)).toBeInTheDocument()
  })
})
