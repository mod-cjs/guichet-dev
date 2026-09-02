/**
 * Data Hub — le dictionnaire en PDF.
 *
 * PAS DE DÉPENDANCE PDF SERVEUR : le projet n'en a aucune, et en ajouter une pour un
 * tableau de 163 lignes coûterait cher pour un rendu inférieur. Les descriptions sont
 * pleines de « », — et d'accents : les polices standard d'un PDF (WinAnsi) ne les encodent
 * pas, il faudrait embarquer une police Unicode complète, gérer la pagination, la coupe de
 * texte et la répétition des en-têtes à la main — tout ce que le moteur d'impression du
 * navigateur fait déjà, mieux, avec la vraie typographie de la plateforme.
 *
 * D'où une vue document dédiée, et `window.print()` qui laisse l'utilisateur choisir
 * « Enregistrer au format PDF ».
 */
import { render, screen } from '@testing-library/react'
import { DictionnaireImprimable } from '@/app/admin/data-hub/imprimer/DictionnaireImprimable'
import type { FluxDictionnaire } from '@/lib/datahub/dictionnaire'

const FLUX: FluxDictionnaire[] = [
  {
    id: 'utilisateurs',
    nom: 'utilisateurs',
    chemin: '/api/v1/export/utilisateurs',
    replication: 'INCREMENTAL',
    clesPrimaires: ['cjs_uid'],
    cleReplication: 'updated_at',
    colonnes: [
      {
        id: 'region',
        nom: 'region',
        type: 'string',
        nullable: true,
        format: null,
        valeurs: ['DAKAR'],
        description: 'Région de résidence déclarée',
        tier: 'public',
      },
    ],
  },
]

beforeEach(() => {
  window.print = jest.fn()
})

describe('Data Hub — DictionnaireImprimable', () => {
  it('rend le dictionnaire sous forme de document', () => {
    render(<DictionnaireImprimable flux={FLUX} filtre={null} />)

    expect(screen.getByRole('heading', { name: /Dictionnaire du Data Hub/ })).toBeInTheDocument()
    expect(screen.getByText('utilisateurs')).toBeInTheDocument()
    expect(screen.getByText('Région de résidence déclarée')).toBeInTheDocument()
  })

  it('ouvre la boîte d’impression tout seul — le bouton « PDF » doit aboutir en un clic', () => {
    render(<DictionnaireImprimable flux={FLUX} filtre={null} />)

    expect(window.print).toHaveBeenCalled()
  })

  it('permet de relancer l’impression si la boîte a été fermée', () => {
    render(<DictionnaireImprimable flux={FLUX} filtre={null} />)
    ;(window.print as jest.Mock).mockClear()

    screen.getByRole('button', { name: /Imprimer/ }).click()

    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('énonce le filtre appliqué — un extrait imprimé doit dire de quoi il est l’extrait', () => {
    render(
      <DictionnaireImprimable flux={FLUX} filtre="colonnes pseudonymes · recherche « region »" />,
    )

    expect(screen.getByText(/colonnes pseudonymes/)).toBeInTheDocument()
  })

  it('compte ce qu’il imprime', () => {
    render(<DictionnaireImprimable flux={FLUX} filtre={null} />)

    expect(screen.getByText(/1 flux/)).toBeInTheDocument()
    expect(screen.getByText(/1 colonne/)).toBeInTheDocument()
  })

  it('porte des règles d’impression — sinon la mise en page admin part sur le papier', () => {
    const { container } = render(<DictionnaireImprimable flux={FLUX} filtre={null} />)
    const styles = container.querySelector('style')?.textContent ?? ''

    expect(styles).toContain('@media print')
    // En-tête de tableau répété à chaque page : un tableau de 163 lignes en fait plusieurs.
    expect(styles).toContain('table-header-group')
  })

  it('masque la barre d’outils à l’impression', () => {
    render(<DictionnaireImprimable flux={FLUX} filtre={null} />)

    expect(screen.getByRole('button', { name: /Imprimer/ }).closest('.sans-impression')).not.toBeNull()
  })
})
