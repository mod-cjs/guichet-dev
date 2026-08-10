/**
 * GUIC-704 · slice 2 (RED) — couche d'enrichissement IA de l'extraction.
 * Le LLM est un SEAM injecté (`appeler`) → tests 100% déterministes, sans réseau.
 * Propriétés vérifiées : merge TROUS-SEULEMENT, discipline enum (région/domaine/type),
 * « n'invente rien » (null → rien), fail-soft (erreur/JSON invalide → {}).
 */
import { enrichirParIa } from '@/lib/curation/extraction/enrichir-ia'

const TYPES = ['emploi', 'bourse', 'concours', 'stage', 'formation']

/** Fabrique un `appeler` qui renvoie le JSON canné (ce que « produirait » le LLM). */
function llm(json: Record<string, unknown> | string | null) {
  return async () => (json === null ? null : typeof json === 'string' ? json : JSON.stringify(json))
}

describe('GUIC-704 — enrichirParIa', () => {
  it('comble les trous du déterministe (organisation, région, type, deadline)', async () => {
    const out = await enrichirParIa(
      { texte: 'GBG recrute un développeur à Dakar. Candidature avant le 15/09/2026.', url: 'https://x.sn/1', dejaConnu: { titre: 'Dev fullstack' } },
      { typesConnus: TYPES, appeler: llm({ organisation: 'GBG', region: 'Dakar', typeSlug: 'emploi', deadline: '2026-09-15', titre: 'IGNORÉ' }) },
    )
    expect(out.organisation).toBe('GBG')
    expect(out.region).toBe('Dakar') // mappé sur l'enum
    expect(out.regionTexte).toBe('Dakar')
    expect(out.typeSlugSchemaOrg).toBe('emploi') // résolu en id par l'appelant (run.ts)
    expect(out.deadline).toBe('2026-09-15')
    expect(out.titre).toBeUndefined() // déjà connu → JAMAIS surchargé
  })

  it('ne surcharge pas une valeur déterministe fiable (merge trous-seulement)', async () => {
    const out = await enrichirParIa(
      { texte: '…', url: 'https://x.sn/1', dejaConnu: { region: 'Thies', organisation: 'ONG A' } },
      { typesConnus: TYPES, appeler: llm({ region: 'Dakar', organisation: 'ONG B' }) },
    )
    expect(out.region).toBeUndefined()
    expect(out.organisation).toBeUndefined()
  })

  it('n’invente rien : des null → aucun champ', async () => {
    const out = await enrichirParIa(
      { texte: 'texte pauvre', url: 'https://x.sn/1', dejaConnu: {} },
      { typesConnus: TYPES, appeler: llm({ organisation: null, region: null, typeSlug: null, deadline: null }) },
    )
    expect(out).toEqual({})
  })

  it('discipline enum : région hors référentiel Sénégal → ignorée', async () => {
    const out = await enrichirParIa(
      { texte: '…', url: 'https://x.sn/1', dejaConnu: {} },
      { typesConnus: TYPES, appeler: llm({ region: 'Paris' }) },
    )
    expect(out.region).toBeUndefined()
  })

  it('discipline type : slug hors liste connue → ignoré', async () => {
    const out = await enrichirParIa(
      { texte: '…', url: 'https://x.sn/1', dejaConnu: {} },
      { typesConnus: TYPES, appeler: llm({ typeSlug: 'licorne' }) },
    )
    expect(out.typeSlugSchemaOrg).toBeUndefined()
  })

  it('deadline invalide → ignorée', async () => {
    const out = await enrichirParIa(
      { texte: '…', url: 'https://x.sn/1', dejaConnu: {} },
      { typesConnus: TYPES, appeler: llm({ deadline: 'bientôt' }) },
    )
    expect(out.deadline).toBeUndefined()
  })

  it('fail-soft : LLM indisponible (null) → {}', async () => {
    const out = await enrichirParIa({ texte: '…', url: 'https://x.sn/1', dejaConnu: {} }, { typesConnus: TYPES, appeler: llm(null) })
    expect(out).toEqual({})
  })

  it('fail-soft : JSON invalide → {}', async () => {
    const out = await enrichirParIa({ texte: '…', url: 'https://x.sn/1', dejaConnu: {} }, { typesConnus: TYPES, appeler: llm('{ cassé') })
    expect(out).toEqual({})
  })

  it('fail-soft : l’appel LLM jette → {}', async () => {
    const out = await enrichirParIa(
      { texte: '…', url: 'https://x.sn/1', dejaConnu: {} },
      { typesConnus: TYPES, appeler: async () => { throw new Error('Vertex down') } },
    )
    expect(out).toEqual({})
  })
})
