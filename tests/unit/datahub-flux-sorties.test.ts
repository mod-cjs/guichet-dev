/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 5) — Le flux `sorties` au Data Hub.
 *
 * Il ferme la boucle ouverte au lot 1 : `CheckIn.dwellMinutes` a été déprécié —
 * jamais écrit, et intenable puisque le renseigner supposerait de MODIFIER une
 * ligne dont `effectueA` est la clé de réplication. Sa description au contrat
 * renvoie vers `duree_minutes`, qui doit donc exister réellement dans l'export.
 *
 * Sans ce lot, l'entrepôt reçoit une promesse sans objet.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { streams } from '@/lib/datahub/streams'

const RACINE = process.cwd()
const lire = (p: string) => readFileSync(resolve(RACINE, p), 'utf-8')

describe('GUIC-689 (M4) — le flux existe et réplique correctement', () => {
  const flux = (streams as unknown as Record<string, { model: string; replicationKey?: string; primaryKey?: string; fields: Record<string, { as: string; tier: string }> }>).sorties

  it('déclaré sur le modèle `SortieCentre`', () => {
    expect(flux).toBeDefined()
    expect(flux.model).toBe('SortieCentre')
  })

  it('répliqué sur `effectueA`, comme les passages — la table est append-only', () => {
    // Une clé fondée sur une colonne modifiable ferait manquer des lignes à
    // l'ETL. Ici rien n'est jamais modifié : `effectueA` suffit et reste juste.
    expect(flux.replicationKey).toBe('effectueA')
    expect(flux.primaryKey).toBe('id')
  })

  it('les identifiants restent pseudonymisés, comme sur `checkins`', () => {
    for (const champ of ['id', 'cjsUid', 'centreId', 'checkInId']) {
      expect(flux.fields[champ]?.tier).toBe('pseudonyme')
    }
  })

  it('la durée est publique — c’est la mesure attendue par l’entrepôt', () => {
    expect(flux.fields.dureeMinutes).toMatchObject({ as: 'duree_minutes', tier: 'public' })
  })

  it('n’expose ni le nonce du jeton ni l’identifiant du scanneur', () => {
    // Le nonce est un secret d'idempotence ; le scanneur est un agent
    // identifiable. Ni l'un ni l'autre n'a sa place dans un export analytique.
    expect(flux.fields.jwtNonce).toBeUndefined()
    expect(flux.fields.scannerId).toBeUndefined()
  })
})

describe('GUIC-689 (M4) — les artefacts publiés suivent', () => {
  // Assertions ANCRÉES sur la structure, pas sur la présence du mot : « sorties »
  // et « duree_minutes » figuraient déjà dans le contrat — via la description de
  // dépréciation de `dwellMinutes`, écrite au lot 1. Trois tests passaient donc
  // grâce à un commentaire.
  it('le contrat OpenAPI expose la ROUTE du flux', () => {
    expect(lire('docs/openapi/datahub-v1.yaml')).toMatch(/^\s{2}"\/export\/sorties":/m)
  })

  it('et son schéma de ligne', () => {
    expect(lire('docs/openapi/datahub-v1.yaml')).toMatch(/^\s{4}sortiesRow:/m)
  })

  it('le manifeste du tap déclare le flux', () => {
    const tap = JSON.parse(lire('etl/plugins/extractors/tap-guichet/tap_guichet/streams.json'))
    const noms = JSON.stringify(tap)
    expect(noms).toMatch(/"sorties"/)
  })

  it('la promesse faite sur `dwellMinutes` a bien un objet', () => {
    // La description dépréciée renvoie vers `duree_minutes` du flux `sorties` :
    // on vérifie que la colonne existe VRAIMENT dans le schéma de ce flux.
    const contrat = lire('docs/openapi/datahub-v1.yaml')
    const debut = contrat.indexOf('sortiesRow:')
    expect(debut).toBeGreaterThan(-1)
    // Borné au schéma SUIVANT, pas à un nombre de caractères : la description
    // du modèle occupait tout l'espace et faisait échouer un test pourtant juste.
    const suite = contrat.slice(debut + 1)
    const fin = suite.search(/\n {4}[A-Za-z]+Row:/)
    const bloc = fin === -1 ? suite : suite.slice(0, fin)
    expect(bloc).toMatch(/duree_minutes/)
  })
})
