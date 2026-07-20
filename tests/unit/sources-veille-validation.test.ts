/**
 * GUIC-596 — US-1 Gestion des sources de veille : validation zod.
 *
 * Contrat du module `@/lib/curation/sources-veille-schema` (spec
 * `.agent_context/specs/M3-curation-opportunites.md` §4) :
 *   - `SourceVeilleCreateSchema` : nom 3-120, url http(s) ≤ 500, méthode/fréquence
 *     dans les enums, `configExtraction` OBLIGATOIRE pour `api` et `html_selecteurs`.
 *   - Défauts : methode `auto`, frequence `quotidienne`, actif `true`.
 *   - `SourceVeilleUpdateSchema` : patch partiel, refuse le patch vide.
 */
import {
  SourceVeilleCreateSchema,
  SourceVeilleUpdateSchema,
  METHODES_EXTRACTION,
  FREQUENCES_VEILLE,
} from '@/lib/curation/sources-veille-schema'

const VALIDE = {
  nom: 'ANPEJ — offres emploi',
  url: 'https://www.anpej.sn/offres',
}

describe('GUIC-596 — SourceVeilleCreateSchema', () => {
  it('accepte une source minimale et applique les défauts (auto, quotidienne, actif)', () => {
    const r = SourceVeilleCreateSchema.safeParse(VALIDE)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.methode).toBe('auto')
      expect(r.data.frequence).toBe('quotidienne')
      expect(r.data.actif).toBe(true)
    }
  })

  it('expose les enums attendus (cascade sans LLM + fréquences)', () => {
    expect(METHODES_EXTRACTION).toEqual(
      expect.arrayContaining(['auto', 'jsonld', 'rss', 'api', 'html_selecteurs', 'article_regex']),
    )
    expect(FREQUENCES_VEILLE).toEqual(
      expect.arrayContaining(['horaire', 'six_heures', 'quotidienne', 'hebdomadaire']),
    )
  })

  it('trim le nom et refuse un nom trop court après trim', () => {
    const ok = SourceVeilleCreateSchema.safeParse({ ...VALIDE, nom: '  Concoursn  ' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.nom).toBe('Concoursn')

    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, nom: ' ab ' }).success).toBe(false)
  })

  it('refuse une URL invalide ou non http(s)', () => {
    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, url: 'pas-une-url' }).success).toBe(false)
    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, url: 'ftp://anpej.sn/offres' }).success).toBe(false)
  })

  it('refuse une méthode ou une fréquence hors enum', () => {
    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, methode: 'llm' }).success).toBe(false)
    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, frequence: 'minute' }).success).toBe(false)
  })

  it('exige configExtraction (objet) pour html_selecteurs et api', () => {
    expect(
      SourceVeilleCreateSchema.safeParse({ ...VALIDE, methode: 'html_selecteurs' }).success,
    ).toBe(false)
    expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, methode: 'api' }).success).toBe(false)

    const avecConfig = SourceVeilleCreateSchema.safeParse({
      ...VALIDE,
      methode: 'html_selecteurs',
      configExtraction: { liste: '.offres article', titre: 'h3 a', lien: 'h3 a@href' },
    })
    expect(avecConfig.success).toBe(true)
  })

  it("n'exige PAS configExtraction pour auto / jsonld / rss", () => {
    for (const methode of ['auto', 'jsonld', 'rss'] as const) {
      expect(SourceVeilleCreateSchema.safeParse({ ...VALIDE, methode }).success).toBe(true)
    }
  })
})

describe('GUIC-596 — SourceVeilleUpdateSchema', () => {
  it('accepte un patch partiel (toggle actif seul)', () => {
    const r = SourceVeilleUpdateSchema.safeParse({ actif: false })
    expect(r.success).toBe(true)
  })

  it('refuse un patch vide', () => {
    expect(SourceVeilleUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('refuse une URL invalide dans un patch', () => {
    expect(SourceVeilleUpdateSchema.safeParse({ url: 'nawak' }).success).toBe(false)
  })
})
