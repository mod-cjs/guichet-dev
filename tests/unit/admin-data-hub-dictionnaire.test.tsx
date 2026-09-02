/**
 * Data Hub — `/admin/data-hub` est le dictionnaire du Data Hub, et rien d'autre.
 *
 * La route s'appelait « data-hub » mais rendait le tableau de bord statistique : le
 * contrat d'export n'avait aucune surface humaine, alors que ses descriptions existent
 * déjà dans `schema.prisma` et voyagent jusqu'à l'entrepôt. Les statistiques ont leur
 * propre route ; cette page ne parle que des flux.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const remplacerUrl = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: remplacerUrl }),
  useSearchParams: () => new URLSearchParams(),
}))

import { DictionnaireClient } from '@/app/admin/data-hub/DictionnaireClient'
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
        valeurs: ['DAKAR', 'THIES'],
        description: 'Région de résidence déclarée',
        tier: 'public',
      },
    ],
  },
  {
    id: 'candidatures',
    nom: 'candidatures',
    chemin: '/api/v1/export/candidatures',
    replication: 'FULL_TABLE',
    clesPrimaires: ['id'],
    cleReplication: null,
    colonnes: [
      {
        id: 'soumise_a',
        nom: 'soumise_a',
        type: 'string',
        nullable: false,
        format: 'date-time',
        valeurs: null,
        description: 'Date de soumission',
        tier: 'pseudonyme',
      },
    ],
  },
]

// Le composant charge les volumes après le rendu : chaque test doit fournir un `fetch`,
// jsdom n'en ayant pas. Défaut neutre — les tests de volume le remplacent.
beforeEach(() => {
  remplacerUrl.mockClear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: {} }),
  }) as unknown as typeof fetch
})

afterEach(() => {
  delete (global as { fetch?: unknown }).fetch
})

describe('Data Hub — DictionnaireClient', () => {
  it('décrit chaque flux du contrat servi', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getByText('utilisateurs')).toBeInTheDocument()
    expect(screen.getByText('/api/v1/export/utilisateurs')).toBeInTheDocument()
    expect(screen.getByText('region')).toBeInTheDocument()
    expect(screen.getByText('Région de résidence déclarée')).toBeInTheDocument()
  })

  it('affiche le tier de gouvernance CDP de chaque colonne', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getAllByText(/pseudonyme/i).length).toBeGreaterThan(0)
  })

  it('signale la méthode de réplication de chaque flux', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getByText('INCREMENTAL')).toBeInTheDocument()
    expect(screen.getByText('FULL_TABLE')).toBeInTheDocument()
  })

  it('filtre les flux à la recherche', () => {
    render(<DictionnaireClient flux={FLUX} />)

    fireEvent.change(screen.getByRole('textbox', { name: /Rechercher/ }), {
      target: { value: 'candidatures' },
    })

    expect(screen.getByText('candidatures')).toBeInTheDocument()
    expect(screen.queryByText('utilisateurs')).not.toBeInTheDocument()
  })

  // Le seul tablist de la page filtre la gouvernance : les statistiques ont leur route.
  it('ne mélange plus les statistiques au dictionnaire', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.queryByRole('tab', { name: /Statistiques/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Statistiques & rapports/ })).not.toBeInTheDocument()
  })
})

describe('Data Hub — DictionnaireClient · vue gouvernance', () => {
  it('propose de filtrer par tier de gouvernance', () => {
    render(<DictionnaireClient flux={FLUX} />)

    const filtres = screen.getByRole('tablist', { name: /gouvernance/i })
    expect(filtres).toBeInTheDocument()
  })

  it('réduit le dictionnaire aux seules colonnes pseudonymes', () => {
    render(<DictionnaireClient flux={FLUX} />)
    fireEvent.click(screen.getByRole('tab', { name: /Pseudonymes/ }))

    expect(screen.getByText('candidatures')).toBeInTheDocument()
    expect(screen.queryByText('utilisateurs')).not.toBeInTheDocument()
  })
})

describe('Data Hub — DictionnaireClient · lien profond', () => {
  it('applique la recherche reçue dans l’URL', () => {
    render(<DictionnaireClient flux={FLUX} requeteInitiale="candidatures" />)

    expect(screen.getByText('candidatures')).toBeInTheDocument()
    expect(screen.queryByText('utilisateurs')).not.toBeInTheDocument()
  })

  it('applique le tier reçu dans l’URL', () => {
    render(<DictionnaireClient flux={FLUX} tierInitial="pseudonyme" />)

    expect(screen.queryByText('utilisateurs')).not.toBeInTheDocument()
  })

  it('écrit la recherche dans l’URL pour que le lien soit partageable', () => {
    render(<DictionnaireClient flux={FLUX} />)
    fireEvent.change(screen.getByRole('textbox', { name: /Rechercher/ }), {
      target: { value: 'candidatures' },
    })

    expect(remplacerUrl).toHaveBeenCalledWith(
      '/admin/data-hub?q=candidatures',
      expect.objectContaining({ scroll: false }),
    )
  })

  it('retire les paramètres de l’URL quand on revient à la vue complète', () => {
    render(<DictionnaireClient flux={FLUX} requeteInitiale="candidatures" />)
    fireEvent.change(screen.getByRole('textbox', { name: /Rechercher/ }), {
      target: { value: '' },
    })

    expect(remplacerUrl).toHaveBeenCalledWith(
      '/admin/data-hub',
      expect.objectContaining({ scroll: false }),
    )
  })
})

describe('Data Hub — DictionnaireClient · volume par flux', () => {
  function repondreVolumes(volumes: Record<string, number | null>) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: volumes }),
    }) as unknown as typeof fetch
  }

  it('affiche le nombre de lignes de chaque flux une fois le comptage chargé', async () => {
    repondreVolumes({ utilisateurs: 4872, candidatures: 130 })
    render(<DictionnaireClient flux={FLUX} />)

    await waitFor(() => expect(screen.getByText(/4\s?872\s+lignes/)).toBeInTheDocument())
  })

  it('signale un flux vide — c’est ce qui passe inaperçu jusqu’aux tableaux de bord', async () => {
    repondreVolumes({ utilisateurs: 0, candidatures: 130 })
    render(<DictionnaireClient flux={FLUX} />)

    await waitFor(() => expect(screen.getByText(/vide/i)).toBeInTheDocument())
  })

  it('reste utilisable si le comptage échoue', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('réseau')) as unknown as typeof fetch
    render(<DictionnaireClient flux={FLUX} />)

    await waitFor(() => expect(screen.getByText('utilisateurs')).toBeInTheDocument())
    expect(screen.queryByText(/lignes/)).not.toBeInTheDocument()
  })
})

describe('Data Hub — DictionnaireClient · fraîcheur du pipeline', () => {
  it('annonce la date du dernier run réussi', () => {
    render(
      <DictionnaireClient
        flux={FLUX}
        fraicheur={{ niveau: 'ok', ageHeures: 7, libelle: 'Dernier run réussi il y a 7 h' }}
      />,
    )

    expect(screen.getByText(/Dernier run réussi il y a 7 h/)).toBeInTheDocument()
  })

  it('alerte quand le dernier run a échoué — c’est une donnée non fiable', () => {
    render(
      <DictionnaireClient
        flux={FLUX}
        fraicheur={{
          niveau: 'echec',
          ageHeures: 1,
          libelle: "Dernier run en ÉCHEC à l'étape extraction",
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/ÉCHEC/)
  })

  it('n’alerte pas quand tout va bien', () => {
    render(
      <DictionnaireClient
        flux={FLUX}
        fraicheur={{ niveau: 'ok', ageHeures: 2, libelle: 'Dernier run réussi il y a 2 h' }}
      />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reste affichable quand aucune fraîcheur n’est connue', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getByText('utilisateurs')).toBeInTheDocument()
  })
})

describe('Data Hub — DictionnaireClient · export', () => {
  it('propose de télécharger le dictionnaire en CSV', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getByRole('link', { name: /CSV/ })).toHaveAttribute(
      'href',
      '/api/admin/data-hub/export',
    )
  })

  it('propose aussi le contrat brut en JSON', () => {
    render(<DictionnaireClient flux={FLUX} />)

    expect(screen.getByRole('link', { name: /JSON/ })).toHaveAttribute(
      'href',
      '/api/admin/data-hub/export?format=json',
    )
  })

  it('propose une version PDF, ouverte dans un onglet dédié', () => {
    render(<DictionnaireClient flux={FLUX} />)
    const lien = screen.getByRole('link', { name: /PDF/ })

    expect(lien).toHaveAttribute('href', '/admin/data-hub/imprimer')
    expect(lien).toHaveAttribute('target', '_blank')
  })

  it('le PDF porte lui aussi les filtres actifs', () => {
    render(<DictionnaireClient flux={FLUX} tierInitial="pseudonyme" />)

    expect(screen.getByRole('link', { name: /PDF/ })).toHaveAttribute(
      'href',
      '/admin/data-hub/imprimer?tier=pseudonyme',
    )
  })

  it('exporte ce qui est affiché — les filtres actifs suivent dans le lien', () => {
    render(<DictionnaireClient flux={FLUX} requeteInitiale="candidatures" tierInitial="pseudonyme" />)

    expect(screen.getByRole('link', { name: /CSV/ })).toHaveAttribute(
      'href',
      '/api/admin/data-hub/export?q=candidatures&tier=pseudonyme',
    )
  })

  it('met à jour le lien d’export quand la recherche change', () => {
    render(<DictionnaireClient flux={FLUX} />)
    fireEvent.change(screen.getByRole('textbox', { name: /Rechercher/ }), {
      target: { value: 'candidatures' },
    })

    expect(screen.getByRole('link', { name: /CSV/ })).toHaveAttribute(
      'href',
      '/api/admin/data-hub/export?q=candidatures',
    )
  })
})
