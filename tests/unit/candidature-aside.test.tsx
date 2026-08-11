/**
 * @jest-environment jsdom
 *
 * GUIC-689 (É-13) — L'aside du détail de candidature.
 *
 * La v5 (`candidatures-web.jsx:134-206`) fait de cet aside le cœur de l'écran :
 * prochaine étape, informations sur l'offre, état du dossier. Le registre le
 * disait bloqué par le modèle de données. Vérification faite, il ne l'est pas :
 * `Opportunite.region`, `Opportunite.remuneration`, `Candidature.updatedAt` et
 * la table `Entretien` existent tous.
 *
 * Règle qui gouverne ces tests : **rien d'inventé**. Un champ absent ne produit
 * pas un tiret décoratif ni une valeur plausible — la ligne disparaît. C'est la
 * même exigence qui a fait retirer le bouton « Retirer ma candidature » quand
 * il ne faisait rien.
 */
import { render, screen } from '@testing-library/react'

import { CandidatureAside } from '@/components/candidatures/CandidatureAside'
import type { CandidatureDetailDTO } from '@/lib/candidature-detail-loader'

const BASE = {
  id: 'c1',
  statut: 'En_attente',
  lettreMotivation: 'Ma lettre',
  cvUrl: 's3://cv.pdf',
  soumiseA: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-05T09:00:00.000Z',
  entretien: null,
  opportunite: {
    slug: 'offre',
    titre: 'Stage data',
    organisation: 'Wave',
    deadline: null,
    type: 'Stage',
    domaine: 'Numerique',
    description: '',
    region: null,
    remuneration: null,
  },
} as unknown as CandidatureDetailDTO

const avec = (patch: Record<string, unknown>) =>
  ({ ...BASE, ...patch, opportunite: { ...BASE.opportunite, ...(patch.opportunite ?? {}) } }) as CandidatureDetailDTO

describe('GUIC-689 (É-13) — prochaine étape', () => {
  it.each([
    ['En_attente', /lecture par le recruteur/i],
    ['Vue', /étudie ton dossier/i],
    ['Retenue', /retenue/i],
    ['Refusee', /pas été retenue/i],
    ['Retiree', /retirée/i],
  ])('statut %s → %s', (statut, attendu) => {
    render(<CandidatureAside candidature={avec({ statut })} />)
    expect(screen.getByTestId('aside-prochaine-etape').textContent).toMatch(attendu)
  })

  it('un entretien PLANIFIÉ prend le pas : il porte une date, c’est la vraie prochaine étape', () => {
    render(
      <CandidatureAside
        candidature={avec({
          statut: 'Vue',
          entretien: { dateHeure: '2026-09-10T14:30:00.000Z', mode: 'Visio', statut: 'Planifie' },
        })}
      />,
    )
    const bloc = screen.getByTestId('aside-prochaine-etape').textContent ?? ''
    expect(bloc).toMatch(/10 septembre/i)
    expect(bloc).toMatch(/visio/i)
  })

  it('un entretien ANNULÉ ne s’affiche pas comme prochaine étape', () => {
    render(
      <CandidatureAside
        candidature={avec({
          statut: 'Vue',
          entretien: { dateHeure: '2026-09-10T14:30:00.000Z', mode: 'Visio', statut: 'Annule' },
        })}
      />,
    )
    expect(screen.getByTestId('aside-prochaine-etape').textContent).toMatch(/étudie ton dossier/i)
  })
})

describe('GUIC-689 (É-13) — l’offre : rien d’inventé', () => {
  it('affiche région et rémunération quand elles existent', () => {
    render(<CandidatureAside candidature={avec({ opportunite: { region: 'Dakar', remuneration: '150 000 FCFA' } })} />)
    const bloc = screen.getByTestId('aside-offre').textContent ?? ''
    expect(bloc).toMatch(/Dakar/)
    expect(bloc).toMatch(/150 000 FCFA/)
  })

  it('une rémunération absente ne produit NI tiret NI « non précisé » — la ligne disparaît', () => {
    render(<CandidatureAside candidature={avec({ opportunite: { region: 'Dakar', remuneration: null } })} />)
    const bloc = screen.getByTestId('aside-offre').textContent ?? ''
    expect(bloc).toMatch(/Dakar/)
    expect(bloc).not.toMatch(/Rémunération/i)
    expect(bloc).not.toMatch(/—/)
  })

  it('aucune information sur l’offre → pas de bloc vide à l’écran', () => {
    render(<CandidatureAside candidature={avec({ opportunite: { region: null, remuneration: null, deadline: null } })} />)
    expect(screen.queryByTestId('aside-offre')).toBeNull()
  })
})

describe('GUIC-689 (É-13) — mon dossier', () => {
  it('dit ce qui est joint', () => {
    render(<CandidatureAside candidature={BASE} />)
    const bloc = screen.getByTestId('aside-dossier').textContent ?? ''
    expect(bloc).toMatch(/CV/)
    expect(bloc).toMatch(/lettre/i)
  })

  it('dit aussi ce qui MANQUE — un dossier incomplet doit se voir', () => {
    render(<CandidatureAside candidature={avec({ cvUrl: null, lettreMotivation: null })} />)
    const bloc = screen.getByTestId('aside-dossier').textContent ?? ''
    expect(bloc).toMatch(/aucun CV/i)
    expect(bloc).toMatch(/aucune lettre/i)
  })

  it('affiche la dernière mise à jour, pas la date de soumission', () => {
    render(<CandidatureAside candidature={BASE} />)
    // updatedAt = 5 août ; soumiseA = 1er août. Les confondre ferait croire que
    // rien n'a bougé depuis l'envoi.
    expect(screen.getByTestId('aside-dossier').textContent).toMatch(/5 août/i)
  })
})
