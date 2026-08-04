/**
 * M13 / Data Hub — dérivation des descripteurs d'extraction (lot 3, spec §7).
 *
 * La spec prévoyait de GÉNÉRER un fichier de descripteurs depuis le contrat. Le contrat
 * étant déjà du TypeScript, les dériver à l'exécution supprime un artefact à maintenir
 * synchronisé — et donc une source de dérive. Le générateur reste nécessaire pour ce qui
 * quitte le dépôt (OpenAPI, schémas du tap, sources dbt), pas pour ce qui y reste.
 *
 * Le descripteur est ce que consomme le socle d'extraction : sélection Prisma, ordre de
 * tri, et projection d'une ligne vers sa forme exportée.
 */
import { describeStream, projectRow, allDescriptors } from '@/lib/datahub/descriptor'
import { streams } from '@/lib/datahub/streams'

describe('describeStream — sélection et tri', () => {
  const d = describeStream('utilisateurs', streams.utilisateurs)

  it('ne sélectionne que les colonnes du contrat', () => {
    expect(Object.keys(d.select).sort()).toEqual(Object.keys(streams.utilisateurs.fields).sort())
    expect(Object.values(d.select).every((v) => v === true)).toBe(true)
  })

  it('trie sur (watermark, clé primaire) — le tri total qui rend le curseur correct', () => {
    expect(d.orderBy).toEqual([{ updatedAt: 'asc' }, { cjsUid: 'asc' }])
  })

  it('reporte les clés du contrat', () => {
    expect(d.primaryKey).toBe('cjsUid')
    expect(d.replicationKey).toBe('updatedAt')
    expect(d.softDelete).toBe('deletedAt')
  })

  it('laisse softDelete indéfini quand le modèle n\'en a pas', () => {
    expect(describeStream('candidatures', streams.candidatures).softDelete).toBeUndefined()
  })
})

describe('projectRow — mise en forme exportée', () => {
  const d = describeStream('utilisateurs', streams.utilisateurs)

  it('renomme les colonnes selon le contrat', () => {
    const out = projectRow(d, { cjsUid: 'abc', region: 'Dakar', createdAt: new Date('2026-01-02T03:04:05.000Z') })
    expect(out.cjs_uid).toBe('abc')
    expect(out.region).toBe('Dakar')
    expect(out.date_inscription).toBe('2026-01-02T03:04:05.000Z')
    // Le nom Prisma ne doit jamais apparaître dans la sortie.
    expect(out.cjsUid).toBeUndefined()
    expect(out.createdAt).toBeUndefined()
  })

  it('applique la transformation avant la sérialisation', () => {
    const out = projectRow(d, { dateNaissance: new Date('2000-01-01T00:00:00.000Z') })
    // Une date brute serait sortie en ISO ; la tranche prouve que la transformation a joué.
    expect(out.tranche_age).toMatch(/^(-18|18-24|25-29|30-34|35\+|inconnu)$/)
    expect(String(out.tranche_age)).not.toContain('2000')
  })

  it('sérialise les dates en ISO 8601', () => {
    const out = projectRow(d, { updatedAt: new Date('2026-07-30T12:00:00.000Z') })
    expect(out.updated_at).toBe('2026-07-30T12:00:00.000Z')
  })

  it('sérialise les BigInt en chaîne — JSON ne sait pas les porter', () => {
    const c = describeStream('consultations', streams.consultations)
    // Constructeur et non littéral `n` : la cible TypeScript du projet est sous ES2020.
    const out = projectRow(c, { id: BigInt('90071992547409911') })
    expect(out.id).toBe('90071992547409911')
  })

  it('préserve les null plutôt que de les omettre', () => {
    const out = projectRow(d, { commune: null, deletedAt: null })
    expect(out.commune).toBeNull()
    expect(out.deleted_at).toBeNull()
  })

  it('n\'invente pas de clé pour une colonne absente de la ligne', () => {
    const out = projectRow(d, { cjsUid: 'abc' })
    expect(Object.keys(out)).toEqual(['cjs_uid'])
  })
})

describe('projectRow — sujet_hash masqué quand cjs_uid est présent (GUIC-695)', () => {
  // Pour un utilisateur connecté, sujet_hash est le HMAC du cjs_uid qui voyage SUR LA
  // MÊME LIGNE : des milliers de couples (clair, haché) offrent un oracle pour confirmer
  // une clé candidate, sans rien apporter aux jointures — cjs_uid les porte déjà.
  // Le hash ne sert donc qu'aux visiteurs anonymes, et ne sort que pour eux.
  const c = describeStream('consultations', streams.consultations)
  const HASH = 'f'.repeat(64)

  it('rend sujet_hash null pour un utilisateur connecté', () => {
    const out = projectRow(c, { cjsUid: 'abc-123', sujetHash: HASH })
    expect(out.cjs_uid).toBe('abc-123')
    expect(out.sujet_hash).toBeNull()
  })

  it('conserve sujet_hash pour un visiteur anonyme', () => {
    const out = projectRow(c, { cjsUid: null, sujetHash: HASH })
    expect(out.sujet_hash).toBe(HASH)
  })
})

describe('allDescriptors — registre complet', () => {
  const all = allDescriptors()

  it('couvre les treize flux du contrat', () => {
    expect(all).toHaveLength(Object.keys(streams).length)
    expect(all).toHaveLength(13)
  })

  it('produit pour chaque flux un tri exploitable et une sélection non vide', () => {
    for (const d of all) {
      expect(d.orderBy).toHaveLength(2)
      expect(Object.keys(d.select).length).toBeGreaterThan(0)
      expect(d.select[d.primaryKey]).toBe(true)
      expect(d.select[d.replicationKey]).toBe(true)
    }
  })
})
