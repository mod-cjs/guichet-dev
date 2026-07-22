/**
 * @jest-environment jsdom
 *
 * GUIC-553 évolution — Éditeur de templates partagé (admin / recruteur).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { TemplatesEditor } from '@/components/notifications/TemplatesEditor'
import type { ResolvedTemplate } from '@/lib/email/templates-defs'

const TPL: ResolvedTemplate = {
  cle: 'pipeline.retenue',
  nom: 'Candidature retenue',
  description: 'Annonce au candidat qu’il est retenu.',
  sujet: 'Félicitations {{prenom}}',
  corps: 'Bonjour {{prenom}}, vous êtes retenu(e) pour {{offre}}.',
  source: 'defaut',
}

const save = jest.fn().mockResolvedValue({ ok: true })
const reset = jest.fn().mockResolvedValue({ ok: true })

beforeEach(() => jest.clearAllMocks())

describe('TemplatesEditor', () => {
  it('liste le template avec sa provenance', () => {
    render(<TemplatesEditor initial={[TPL]} save={save} reset={reset} resetHint={['recruteur']} />)
    expect(screen.getByText('Candidature retenue')).toBeInTheDocument()
    expect(screen.getByText('Défaut')).toBeInTheDocument()
  })

  it('Consulter/Modifier ouvre l’édition et Enregistrer appelle save avec les valeurs', async () => {
    render(<TemplatesEditor initial={[TPL]} save={save} reset={reset} resetHint={['recruteur']} />)
    fireEvent.click(screen.getByRole('button', { name: /Consulter \/ Modifier/i }))
    fireEvent.change(screen.getByLabelText(/Sujet/i), { target: { value: 'Nouveau sujet' } })
    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/i }))
    await waitFor(() => expect(save).toHaveBeenCalledWith('pipeline.retenue', 'Nouveau sujet', TPL.corps))
  })

  it('l’aperçu rend les variables avec les données d’exemple', () => {
    render(<TemplatesEditor initial={[TPL]} save={save} reset={reset} resetHint={['recruteur']} />)
    fireEvent.click(screen.getByRole('button', { name: /Consulter \/ Modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Aperçu$/i }))
    expect(screen.getByText(/Félicitations Awa/)).toBeInTheDocument()
  })

  it('Réinitialiser n’apparaît pas pour la provenance défaut', () => {
    render(<TemplatesEditor initial={[TPL]} save={save} reset={reset} resetHint={['recruteur']} />)
    fireEvent.click(screen.getByRole('button', { name: /Consulter \/ Modifier/i }))
    expect(screen.queryByRole('button', { name: /Réinitialiser/i })).not.toBeInTheDocument()
  })

  it('Réinitialiser apparaît et appelle reset pour une version personnalisée', async () => {
    window.confirm = jest.fn(() => true)
    render(<TemplatesEditor initial={[{ ...TPL, source: 'recruteur' }]} save={save} reset={reset} resetHint={['recruteur']} />)
    fireEvent.click(screen.getByRole('button', { name: /Consulter \/ Modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /Réinitialiser/i }))
    await waitFor(() => expect(reset).toHaveBeenCalledWith('pipeline.retenue'))
  })
})
