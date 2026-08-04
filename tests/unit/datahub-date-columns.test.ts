/**
 * M13 / Data Hub — colonnes date exportées (GUIC-696, lot 4, R1).
 *
 * Le pré-vol (`scripts/datahub/preflight.ts`) ne contrôlait les dates invalides que sur
 * les 13 clés de réplication, alors que le contrat exporte environ 35 colonnes date. Preuve
 * du rapport GUIC-693 : une seule `date_naissance = '0000-00-00'` sur la 5001ᵉ ligne du tri
 * d'`utilisateurs` passe le pré-vol (vert — il ne regarde pas cette colonne), puis fait
 * planter l'extraction en 500 à la page 5, définitivement, le tri étant déterministe.
 *
 * `colonnesDateExportees` est la fonction PURE qui donne au pré-vol la liste complète à
 * vérifier — dérivée du contrat, pas d'une énumération à tenir à jour à la main.
 */
import { colonnesDateExportees } from '@/lib/datahub/date-columns'
import { allDescriptors } from '@/lib/datahub/descriptor'
import { parseSchemaDoc } from '@/lib/datahub/schema-doc'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const models = parseSchemaDoc(readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8'))
const descriptors = allDescriptors()

describe('colonnesDateExportees', () => {
  const colonnes = colonnesDateExportees(descriptors, models)

  it('couvre bien plus que les 13 clés de réplication', () => {
    // Preuve directe du défaut R1 : le pré-vol actuel n'en contrôle que 13.
    expect(colonnes.length).toBeGreaterThan(13)
  })

  it('inclut une colonne date qui n\'est PAS une clé de réplication (candidatures.soumise_a)', () => {
    expect(
      colonnes.some((c) => c.stream === 'candidatures' && c.column === 'soumise_a')
    ).toBe(true)
  })

  it('inclut la colonne source d\'une transformation (dateNaissance → tranche_age)', () => {
    // Le crash Prisma se produit à la LECTURE de la colonne brute, avant que la
    // transformation ne s'exécute : une date_naissance invalide plante `findMany` même si
    // `trancheAge` sait rendre "inconnu" une fois la valeur en main.
    expect(
      colonnes.some((c) => c.stream === 'utilisateurs' && c.column === 'date_naissance')
    ).toBe(true)
  })

  it('inclut toujours les clés de réplication elles-mêmes', () => {
    expect(colonnes.some((c) => c.stream === 'utilisateurs' && c.column === 'updated_at')).toBe(true)
    expect(colonnes.some((c) => c.stream === 'consultations' && c.column === 'created_at')).toBe(true)
  })

  it('n\'inclut aucune colonne non-date (fail-closed sur le type)', () => {
    expect(colonnes.some((c) => c.stream === 'utilisateurs' && c.column === 'region')).toBe(false)
    expect(colonnes.some((c) => c.stream === 'utilisateurs' && c.column === 'cjs_uid')).toBe(false)
  })

  it('porte la table physique, pas le nom du modèle', () => {
    const checkins = colonnes.find((c) => c.stream === 'checkins')
    expect(checkins?.table).toBe('check_ins')
  })
})
