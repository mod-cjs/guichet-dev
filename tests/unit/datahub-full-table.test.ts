/**
 * M13 / Data Hub — support FULL_TABLE pour les tables de jonction programmes (GUIC-700,
 * lot 7, arbitrage 3).
 *
 * Les 5 tables `*_programmes` (opportunites, ressources, evenements, centres,
 * organisations) n'ont NI horodatage NI clé primaire simple — seulement deux clés
 * étrangères (composite) et un booléen `principal`. Aucun watermark n'y est disponible :
 * l'extraction incrémentale (`keyset.ts`) est structurellement impossible. `v_programs_summary`
 * (GUIC-149) est livré dégradé depuis l'origine pour cette raison exacte.
 *
 * Solution retenue : un flux FULL_TABLE se réextrait intégralement à chaque run — ces
 * tables sont petites, c'est la réponse Singer habituelle pour les tables de référence.
 * Contrat, descripteur et export sont un système PARALLÈLE à l'incrémental (`streams.ts`,
 * `descriptor.ts`, `keyset.ts`), pas une extension de celui-ci : la clé composite et
 * l'absence de watermark en changent la forme au niveau du TYPE, pas seulement du
 * comportement, et forcer ces cinq flux dans le système incrémental aurait affaibli les
 * garanties de tsc pour les treize autres.
 */
import {
  defineFullTableStream,
  type AnyFullTableDefinition,
} from '@/lib/datahub/full-table-types'
import {
  fullTableStreams,
} from '@/lib/datahub/full-table-streams'
import {
  describeFullTableStream,
  allFullTableDescriptors,
  fullTableDescriptorFor,
  projectFullTableRow,
} from '@/lib/datahub/full-table-descriptor'
import {
  fullTableExport,
  encodeFullTableCursor,
  decodeFullTableCursor,
} from '@/lib/datahub/full-table-export'
import { BadCursorError } from '@/lib/datahub/cursor'

describe('defineFullTableStream — contrat', () => {
  it('porte le modèle et la clé composite', () => {
    const def = defineFullTableStream('OpportuniteProgramme', {
      primaryKey: ['opportuniteId', 'programmeId'],
      fields: {
        opportuniteId: { as: 'opportunite_id', tier: 'pseudonyme' },
        programmeId: { as: 'programme_id', tier: 'pseudonyme' },
        principal: { as: 'principal', tier: 'public' },
      },
    })
    expect(def.model).toBe('OpportuniteProgramme')
    expect(def.primaryKey).toEqual(['opportuniteId', 'programmeId'])
  })
})

describe('fullTableStreams — registre', () => {
  it('couvre les cinq tables de jonction programmes', () => {
    expect(Object.keys(fullTableStreams).sort()).toEqual([
      'centres_programmes',
      'evenements_programmes',
      'opportunites_programmes',
      'organisations_programmes',
      'ressources_programmes',
    ])
  })

  it('chaque flux déclare une clé composite de deux champs et le booléen principal', () => {
    for (const def of Object.values(fullTableStreams) as AnyFullTableDefinition[]) {
      expect(def.primaryKey).toHaveLength(2)
      expect(Object.keys(def.fields)).toContain('principal')
    }
  })
})

describe('describeFullTableStream — sélection et tri', () => {
  const d = describeFullTableStream('opportunites_programmes', fullTableStreams.opportunites_programmes)

  it('trie sur la clé composite complète, dans l\'ordre déclaré', () => {
    expect(d.orderBy).toEqual([{ opportuniteId: 'asc' }, { programmeId: 'asc' }])
  })

  it('ne sélectionne que les colonnes du contrat', () => {
    expect(Object.keys(d.select).sort()).toEqual(
      Object.keys(fullTableStreams.opportunites_programmes.fields).sort()
    )
  })

  it('rend tous les flux via allFullTableDescriptors', () => {
    expect(allFullTableDescriptors()).toHaveLength(5)
  })

  it('résout un flux par son nom, ou null s\'il est inconnu', () => {
    expect(fullTableDescriptorFor('opportunites_programmes')).not.toBeNull()
    expect(fullTableDescriptorFor('inconnu')).toBeNull()
    // Fail-closed : un nom de flux incrémental n'est pas un flux FULL_TABLE.
    expect(fullTableDescriptorFor('utilisateurs')).toBeNull()
  })
})

describe('projectFullTableRow — mise en forme exportée', () => {
  const d = describeFullTableStream('opportunites_programmes', fullTableStreams.opportunites_programmes)

  it('renomme les colonnes selon le contrat', () => {
    const out = projectFullTableRow(d, { opportuniteId: 'o1', programmeId: 'p1', principal: true })
    expect(out).toEqual({ opportunite_id: 'o1', programme_id: 'p1', principal: true })
  })
})

describe('cursor composite — aller-retour', () => {
  it('restitue exactement les deux valeurs encodées', () => {
    const cursor = encodeFullTableCursor(['o1', 'p1'])
    expect(decodeFullTableCursor(cursor)).toEqual(['o1', 'p1'])
  })

  it('refuse un curseur malformé', () => {
    expect(() => decodeFullTableCursor('###')).toThrow(BadCursorError)
  })
})

describe('fullTableExport — requête construite', () => {
  const d = describeFullTableStream('opportunites_programmes', fullTableStreams.opportunites_programmes)

  function delegate(rows: Record<string, unknown>[] = []) {
    const calls: Record<string, unknown>[] = []
    return { calls, findMany: async (args: Record<string, unknown>) => { calls.push(args); return rows } }
  }

  it('n\'applique JAMAIS de filtre `since` — un flux FULL_TABLE se réextrait en entier', async () => {
    const del = delegate()
    await fullTableExport(d, {}, del)
    expect(del.calls[0].where).toEqual({})
  })

  it('pagine sur la clé composite, sans watermark', async () => {
    const del = delegate()
    const cursor = encodeFullTableCursor(['o1', 'p1'])
    await fullTableExport(d, { cursor }, del)

    expect(del.calls[0].where).toEqual({
      OR: [
        { opportuniteId: { gt: 'o1' } },
        { opportuniteId: 'o1', programmeId: { gt: 'p1' } },
      ],
    })
  })

  it('signale la page suivante et positionne le curseur sur la dernière ligne SERVIE', async () => {
    const rows = [
      { opportuniteId: 'o1', programmeId: 'p1', principal: true },
      { opportuniteId: 'o1', programmeId: 'p2', principal: false },
    ]
    const page = await fullTableExport(d, { limit: 1 }, delegate(rows))

    expect(page.data).toHaveLength(1)
    expect(page.meta.has_more).toBe(true)
    expect(decodeFullTableCursor(page.meta.next_cursor as string)).toEqual(['o1', 'p1'])
  })

  it('clôt la pagination sur un résultat vide', async () => {
    const page = await fullTableExport(d, {}, delegate([]))
    expect(page.data).toEqual([])
    expect(page.meta.has_more).toBe(false)
    expect(page.meta.next_cursor).toBeNull()
  })

  it('refuse un curseur malformé sans interroger la base', async () => {
    const del = delegate()
    await expect(fullTableExport(d, { cursor: '###' }, del)).rejects.toBeInstanceOf(BadCursorError)
    expect(del.calls).toHaveLength(0)
  })
})
