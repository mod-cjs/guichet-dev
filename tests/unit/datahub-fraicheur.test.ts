/**
 * Data Hub — fraîcheur du pipeline Data Hub.
 *
 * « Ces chiffres datent de quand ? » est la première question d'un administrateur devant
 * un tableau de bord, et rien dans la plateforme n'y répondait : l'état des runs ne vivait
 * que dans un fichier de log sur l'hôte ETL. Le pipeline publie désormais son résultat, et
 * cette fonction le traduit en une phrase.
 */
import {
  resumerFraicheur,
  lirePublication,
  SEUIL_RETARD_H,
  type RunDatahub,
} from '@/lib/datahub/fraicheur'

const MAINTENANT = new Date('2026-08-31T10:00:00.000Z')

function run(partiel: Partial<RunDatahub>): RunDatahub {
  return {
    statut: 'succes',
    etape: 'complet',
    termineA: new Date('2026-08-31T02:45:00.000Z'),
    message: null,
    ...partiel,
  }
}

describe('Data Hub — resumerFraicheur', () => {
  it('sait dire qu’aucun run n’a jamais été enregistré', () => {
    const f = resumerFraicheur(null, MAINTENANT)

    expect(f.niveau).toBe('inconnu')
    expect(f.ageHeures).toBeNull()
  })

  it('rend « à jour » un run réussi de la nuit même', () => {
    const f = resumerFraicheur(run({}), MAINTENANT)

    expect(f.niveau).toBe('ok')
    expect(f.ageHeures).toBe(7)
  })

  it('signale un retard quand une nuit a été manquée', () => {
    const f = resumerFraicheur(
      run({ termineA: new Date('2026-08-30T02:45:00.000Z') }),
      MAINTENANT,
    )

    expect(f.niveau).toBe('retard')
    expect(f.ageHeures).toBeGreaterThan(SEUIL_RETARD_H)
  })

  it('signale un échec même tout récent — un run rouge n’est pas une donnée fraîche', () => {
    const f = resumerFraicheur(
      run({ statut: 'echec', etape: 'extraction', termineA: MAINTENANT }),
      MAINTENANT,
    )

    expect(f.niveau).toBe('echec')
    expect(f.libelle).toMatch(/extraction/i)
  })

  it('nomme l’étape fautive pour qu’on sache où regarder', () => {
    const f = resumerFraicheur(
      run({ statut: 'echec', etape: 'reconciliation', termineA: MAINTENANT }),
      MAINTENANT,
    )

    expect(f.libelle).toMatch(/réconciliation/i)
  })

  it('ne rend jamais un âge négatif si l’horloge de l’hôte ETL est en avance', () => {
    const f = resumerFraicheur(
      run({ termineA: new Date('2026-08-31T10:05:00.000Z') }),
      MAINTENANT,
    )

    expect(f.ageHeures).toBe(0)
    expect(f.niveau).toBe('ok')
  })
})

describe('Data Hub — lirePublication', () => {
  const DEBUT = '2026-08-31T02:30:00.000Z'

  it('accepte une publication de run réussi', () => {
    const p = lirePublication(['succes', 'complet', DEBUT])

    expect(p.statut).toBe('succes')
    expect(p.etape).toBe('complet')
    expect(p.demarreA.toISOString()).toBe(DEBUT)
    expect(p.message).toBeNull()
  })

  it('conserve le message d’échec, recollé s’il contient des espaces', () => {
    const p = lirePublication(['echec', 'dbt', DEBUT, 'test', 'unique_cjs_uid', 'en', 'échec'])

    expect(p.message).toBe('test unique_cjs_uid en échec')
  })

  it('refuse un statut inconnu plutôt que de l’écrire en base', () => {
    expect(() => lirePublication(['peut-etre', 'complet', DEBUT])).toThrow(/statut/i)
  })

  it('refuse une étape inconnue', () => {
    expect(() => lirePublication(['succes', 'chargement', DEBUT])).toThrow(/étape/i)
  })

  it('refuse une date de démarrage illisible', () => {
    expect(() => lirePublication(['succes', 'complet', 'hier'])).toThrow(/date/i)
  })

  it('refuse un appel incomplet', () => {
    expect(() => lirePublication(['succes'])).toThrow()
  })

  it('tronque un message trop long — la colonne n’est pas un journal', () => {
    const p = lirePublication(['echec', 'extraction', DEBUT, 'x'.repeat(3000)])

    expect(p.message).toHaveLength(1000)
  })
})
