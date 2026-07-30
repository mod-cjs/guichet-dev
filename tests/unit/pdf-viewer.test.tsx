/**
 * @jest-environment jsdom
 *
 * GUIC-689 (F-5) — le viewer PDF ne doit jamais rendre une <iframe> pointée vers
 * une réponse d'erreur : le proxy `/api/ressources/[id]/proxy` peut échouer (401,
 * 502, 415…) et une page/JSON d'erreur embarquée déclenche une violation CSP
 * (`frame-ancestors`) + une iframe blanche. `PdfViewer` fait une vérification
 * préalable (`HEAD`) et bascule sur son fallback texte quand elle échoue.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { PdfViewer } from '@/components/ui/PdfViewer'

function mockFetchOk(ok: boolean, status = ok ? 200 : 502) {
  global.fetch = jest.fn().mockResolvedValue({ ok, status }) as unknown as typeof fetch
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('<PdfViewer /> — robustesse proxy (GUIC-689 F-5)', () => {
  it('vérifie la disponibilité du PDF via une requête HEAD sur le proxy', async () => {
    mockFetchOk(true)
    render(<PdfViewer url="/api/ressources/r1/proxy" title="Guide CV" />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ressources/r1/proxy',
        expect.objectContaining({ method: 'HEAD' }),
      )
    })
  })

  it('rend l’iframe quand la vérification réussit', async () => {
    mockFetchOk(true)
    render(<PdfViewer url="/api/ressources/r1/proxy" title="Guide CV" />)
    await waitFor(() => {
      expect(screen.getByTitle('Guide CV')).toBeInTheDocument()
    })
  })

  it('n’affiche PAS l’iframe pendant la vérification initiale (pas d’iframe blanche)', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    render(<PdfViewer url="/api/ressources/r1/proxy" title="Guide CV" />)
    expect(screen.queryByTitle('Guide CV')).not.toBeInTheDocument()
  })

  it('bascule sur le fallback téléchargement (pas d’iframe) quand le proxy répond en erreur (502)', async () => {
    mockFetchOk(false, 502)
    render(<PdfViewer url="/api/ressources/r1/proxy" title="Guide CV" />)
    await waitFor(() => {
      expect(screen.getByText(/télécharger le fichier/i)).toBeInTheDocument()
    })
    expect(screen.queryByTitle('Guide CV')).not.toBeInTheDocument()
  })

  it('bascule sur le fallback quand la requête réseau échoue (rejet)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch
    render(<PdfViewer url="/api/ressources/r1/proxy" title="Guide CV" />)
    await waitFor(() => {
      expect(screen.getByText(/ouvrir dans un nouvel onglet/i)).toBeInTheDocument()
    })
    expect(screen.queryByTitle('Guide CV')).not.toBeInTheDocument()
  })
})
