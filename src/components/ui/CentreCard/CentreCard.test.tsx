/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CentreCard, type CentreCardData } from './index'

const base: CentreCardData = { id: 'c1', nom: 'Centre de Dakar', region: 'Dakar', estActif: true, jeunes: 542, agents: 7 }

describe('CentreCard', () => {
  it('affiche nom, région, badge Actif et les stats jeunes/agents', () => {
    render(<CentreCard centre={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Centre de Dakar')).toBeInTheDocument()
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText(/^Actif$/)).toBeInTheDocument()
    expect(screen.getByText('542')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('inactif → badge Inactif', () => {
    render(<CentreCard centre={{ ...base, estActif: false }} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/^Inactif$/)).toBeInTheDocument()
  })

  it('la carte ouvre la fiche du centre (GUIC-687)', () => {
    render(<CentreCard centre={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('link', { name: /fiche de/i })).toHaveAttribute('href', '/admin/centres/c1')
  })

  it('lien Ressources vers l\'onglet ressources de la fiche', () => {
    render(<CentreCard centre={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('link', { name: /Ressources/ })).toHaveAttribute('href', '/admin/centres/c1?tab=ressources')
  })

  it('Modifier / Supprimer déclenchent les callbacks avec le centre', async () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()
    render(<CentreCard centre={base} onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /modifier/i }))
    await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(onEdit).toHaveBeenCalledWith(base)
    expect(onDelete).toHaveBeenCalledWith(base)
  })

  it('n’utilise aucune valeur hex inline (tokens gj-* uniquement)', () => {
    const { container } = render(<CentreCard centre={base} onEdit={() => {}} onDelete={() => {}} />)
    const styles = Array.from(container.querySelectorAll('[style]')).map((el) => el.getAttribute('style') ?? '').join(' ')
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/)
  })
})
