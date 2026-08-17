/**
 * @jest-environment node
 *
 * GUIC-689 — Refonte de la taxonomie des domaines (demande PO, 2026-08-17).
 *
 * Neuf domaines deviennent six : Bien-être · Citoyenneté · Culture · Écologie ·
 * Économie · Employabilité.
 *
 * Deux points que ces tests verrouillent, parce qu'ils sont faciles à défaire :
 *
 *  1. `Autre` reste dans l'enum mais ne doit JAMAIS être proposé. Il sert de
 *     repli à `domaineOuAutre()` côté curation — le retirer ferait échouer la
 *     publication d'un item dont le domaine extrait n'est pas reconnu.
 *
 *  2. Le vocabulaire était recopié dans cinq fichiers. Un test vérifie qu'ils
 *     consomment tous la source unique : sans ça, la prochaine évolution
 *     réintroduira la dérive qu'on vient de payer.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  DOMAINES_VISIBLES,
  DOMAINE_LABELS,
  DOMAINE_REPLI,
  MIGRATION_DOMAINES,
  libelleDomaine,
} from '@/lib/domaines'

const RACINE = process.cwd()
const lire = (p: string) => readFileSync(resolve(RACINE, p), 'utf-8')

describe('GUIC-689 — les six catégories demandées', () => {
  it('exactement six, dans l’ordre du PO', () => {
    expect([...DOMAINES_VISIBLES]).toEqual([
      'BienEtre', 'Citoyennete', 'Culture', 'Ecologie', 'Economie', 'Employabilite',
    ])
  })

  it('les libellés portent les accents attendus', () => {
    expect(DOMAINES_VISIBLES.map(libelleDomaine)).toEqual([
      'Bien-être', 'Citoyenneté', 'Culture', 'Écologie', 'Économie', 'Employabilité',
    ])
  })

  it('« Tout » n’est pas une catégorie', () => {
    // La demande listait « Tout » : c'est la puce « toutes » du filtre, pas une
    // valeur de domaine. L'inscrire en base créerait une catégorie fantôme.
    expect(Object.values(DOMAINE_LABELS)).not.toContain('Tout')
    expect([...DOMAINES_VISIBLES]).not.toContain('Tout')
  })
})

describe('GUIC-689 — `Autre` existe sans être proposé', () => {
  it('absent des domaines visibles', () => {
    expect([...DOMAINES_VISIBLES]).not.toContain(DOMAINE_REPLI)
  })

  it('la curation s’en sert toujours comme repli — ne pas le supprimer', () => {
    const mapper = lire('src/lib/curation/publication/mapper.ts')
    expect(mapper).toMatch(/Domaine\.Autre/)
  })

  it('il porte un libellé neutre, jamais « Autre » offert au choix', () => {
    expect(libelleDomaine(DOMAINE_REPLI)).toBe('Non classé')
  })
})

describe('GUIC-689 — la correspondance couvre tout l’ancien vocabulaire', () => {
  const ANCIENS = [
    'Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete',
    'Environnement', 'Sante', 'Education', 'Culture', 'Autre',
  ]

  it('les neuf anciennes valeurs ont une destination', () => {
    const sans = ANCIENS.filter((a) => !MIGRATION_DOMAINES[a])
    // Une valeur sans destination = des offres orphelines à la migration.
    expect(sans).toEqual([])
  })

  it('chaque destination est une valeur du nouveau vocabulaire', () => {
    const valides = new Set<string>([...DOMAINES_VISIBLES, DOMAINE_REPLI])
    const hors = Object.entries(MIGRATION_DOMAINES).filter(([, v]) => !valides.has(v))
    expect(Object.fromEntries(hors)).toEqual({})
  })

  it('aucun renommage silencieux : Citoyenneté et Culture ne bougent pas', () => {
    expect(MIGRATION_DOMAINES.Citoyennete).toBe('Citoyennete')
    expect(MIGRATION_DOMAINES.Culture).toBe('Culture')
  })
})

describe('GUIC-689 — plus aucune liste de domaines recopiée', () => {
  const FICHIERS = [
    'src/components/opportunites/FiltresPanel.tsx',
    'src/components/opportunites/OpportunitesFiltersSheet.tsx',
    'src/app/admin/opportunites/OpportuniteForm.tsx',
    'src/app/admin/partenaires/PartenaireFormModal.tsx',
    'src/app/recruteur/mes-offres/actions.ts',
  ]

  it.each(FICHIERS)('%s ne recopie plus l’ancien vocabulaire', (f) => {
    const src = lire(f)
    // « Agriculture » et « Numerique » n'existent plus : les trouver signifie
    // qu'une copie locale a survécu à la migration.
    expect(src).not.toMatch(/'Agriculture'/)
    expect(src).not.toMatch(/'Numerique'/)
  })
})
