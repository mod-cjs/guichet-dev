/**
 * M13 / Data Hub — extraction paginée par curseur (lot 4, spec §8.2).
 *
 * Trois invariants portent toute la fiabilité du pipeline. Si l'un saute, l'extraction
 * perd des lignes SANS lever d'erreur :
 *   1. tri total `(watermark, clé primaire)` ;
 *   2. curseur positionnel, jamais un offset ;
 *   3. borne `since` inclusive, le recouvrement côté tap absorbant les doublons.
 *
 * Le délégué Prisma est injecté : ces tests portent sur la requête CONSTRUITE, pas sur la
 * base. Une erreur de clause `where` est exactement le genre de défaut qu'un test contre
 * une base de démonstration ne révèle pas.
 */
import { keysetExport, LIMIT_DEFAUT, LIMIT_MAX } from '@/lib/datahub/keyset'
import { describeStream } from '@/lib/datahub/descriptor'
import { encodeCursor, BadCursorError } from '@/lib/datahub/cursor'
import { streams } from '@/lib/datahub/streams'

const utilisateurs = describeStream('utilisateurs', streams.utilisateurs)
const consultations = describeStream('consultations', streams.consultations)

/** Délégué qui mémorise ses arguments et rend les lignes fournies. */
function delegate(rows: Record<string, unknown>[] = []) {
  const calls: Record<string, unknown>[] = []
  return {
    calls,
    findMany: async (args: Record<string, unknown>) => {
      calls.push(args)
      return rows
    },
  }
}

function ligne(i: number, iso: string): Record<string, unknown> {
  return { cjsUid: `u${i}`, updatedAt: new Date(iso), region: 'Dakar' }
}

describe('keysetExport — requête construite', () => {
  it('sélectionne le contrat, trie totalement, et lit une ligne de plus que demandé', async () => {
    const d = delegate()
    await keysetExport(utilisateurs, { limit: 10 }, d)

    expect(d.calls[0].select).toEqual(utilisateurs.select)
    expect(d.calls[0].orderBy).toEqual([{ updatedAt: 'asc' }, { cjsUid: 'asc' }])
    // +1 : sonde l'existence d'une page suivante sans payer un COUNT par page.
    expect(d.calls[0].take).toBe(11)
  })

  it('borne la taille de page entre 1 et le maximum, avec un défaut explicite', async () => {
    const d = delegate()
    await keysetExport(utilisateurs, {}, d)
    expect(d.calls[0].take).toBe(LIMIT_DEFAUT + 1)

    await keysetExport(utilisateurs, { limit: 99999 }, d)
    expect(d.calls[1].take).toBe(LIMIT_MAX + 1)

    await keysetExport(utilisateurs, { limit: 0 }, d)
    expect(d.calls[2].take).toBe(2)
  })

  it('traduit `since` en borne inclusive sur le watermark', async () => {
    const d = delegate()
    await keysetExport(utilisateurs, { since: '2026-07-01T00:00:00.000Z' }, d)
    expect(d.calls[0].where).toEqual({ updatedAt: { gte: new Date('2026-07-01T00:00:00.000Z') } })
  })

  it('traduit le curseur en comparaison lexicographique sur (watermark, clé primaire)', async () => {
    const d = delegate()
    const cursor = encodeCursor({ t: '2026-07-01T10:00:00.000Z', i: 'u42' })
    await keysetExport(utilisateurs, { cursor }, d)

    expect(d.calls[0].where).toEqual({
      OR: [
        { updatedAt: { gt: new Date('2026-07-01T10:00:00.000Z') } },
        // Départage les lignes portant le même watermark — sans quoi elles seraient
        // relues en boucle ou sautées.
        { updatedAt: new Date('2026-07-01T10:00:00.000Z'), cjsUid: { gt: 'u42' } },
      ],
    })
  })

  it('ignore `since` quand un curseur est fourni — la position prime sur la borne', async () => {
    const d = delegate()
    const cursor = encodeCursor({ t: '2026-07-01T10:00:00.000Z', i: 'u42' })
    await keysetExport(utilisateurs, { cursor, since: '2020-01-01T00:00:00.000Z' }, d)
    expect(JSON.stringify(d.calls[0].where)).not.toContain('gte')
  })

  it('convertit la clé primaire en BigInt quand le flux le déclare', async () => {
    const d = delegate()
    const cursor = encodeCursor({ t: '2026-07-01T10:00:00.000Z', i: '90071992547409919' })
    await keysetExport(consultations, { cursor }, d)

    const where = d.calls[0].where as { OR: Array<Record<string, unknown>> }
    // Prisma refuse une chaîne là où le schéma déclare un BigInt.
    expect(where.OR[1].id).toEqual({ gt: BigInt('90071992547409919') })
  })

  it('refuse un curseur malformé par une erreur typée, sans interroger la base', async () => {
    const d = delegate()
    await expect(keysetExport(utilisateurs, { cursor: '###' }, d)).rejects.toBeInstanceOf(BadCursorError)
    expect(d.calls).toHaveLength(0)
  })
})

describe('keysetExport — page rendue', () => {
  it('signale la page suivante et n\'émet pas la ligne de sonde', async () => {
    const rows = [ligne(1, '2026-07-01T00:00:00.000Z'), ligne(2, '2026-07-02T00:00:00.000Z')]
    const page = await keysetExport(utilisateurs, { limit: 1 }, delegate(rows))

    expect(page.data).toHaveLength(1)
    expect(page.meta.has_more).toBe(true)
    expect(page.meta.next_cursor).not.toBeNull()
  })

  it('positionne le curseur sur la dernière ligne SERVIE, pas sur la sonde', async () => {
    const rows = [ligne(1, '2026-07-01T00:00:00.000Z'), ligne(2, '2026-07-02T00:00:00.000Z')]
    const page = await keysetExport(utilisateurs, { limit: 1 }, delegate(rows))

    const decode = JSON.parse(Buffer.from(page.meta.next_cursor as string, 'base64url').toString())
    // Pointer la sonde ferait sauter la ligne 2 à la page suivante.
    expect(decode).toEqual({ t: '2026-07-01T00:00:00.000Z', i: 'u1' })
  })

  it('clôt la pagination quand la page n\'est pas pleine', async () => {
    const page = await keysetExport(utilisateurs, { limit: 10 }, delegate([ligne(1, '2026-07-01T00:00:00.000Z')]))
    expect(page.meta.has_more).toBe(false)
    expect(page.meta.next_cursor).toBeNull()
  })

  it('clôt la pagination sur un résultat vide', async () => {
    const page = await keysetExport(utilisateurs, {}, delegate([]))
    expect(page.data).toEqual([])
    expect(page.meta.next_cursor).toBeNull()
    expect(page.meta.has_more).toBe(false)
  })

  it('projette les lignes selon le contrat — renommage et transformation', async () => {
    const page = await keysetExport(utilisateurs, {}, delegate([ligne(1, '2026-07-01T00:00:00.000Z')]))
    expect(page.data[0]).toEqual({
      cjs_uid: 'u1',
      updated_at: '2026-07-01T00:00:00.000Z',
      region: 'Dakar',
    })
  })

  it('annonce la colonne de réplication, que le tap doit connaître', async () => {
    const page = await keysetExport(consultations, {}, delegate([]))
    expect(page.meta.replication_key).toBe('createdAt')
    expect(page.meta.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
