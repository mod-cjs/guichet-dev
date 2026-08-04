/**
 * M13 / Data Hub — validation de la borne `since` (GUIC-696, lot 3, S2/S3).
 *
 * Deux défauts du rapport d'épreuve GUIC-693, tous deux « une entrée invalide produit un
 * résultat faux plutôt qu'une erreur » — le pire mode de défaillance pour un ETL :
 *
 *  - S3 : `[stream]/route.ts` passait `since` tel quel à `new Date(...)` sans validation.
 *    Une borne illisible (`pas-une-date`) rendait 500 au lieu de 400, alors que la route
 *    `counts` — qui valide — rend bien 400 pour la même entrée. Un 500 est retriable pour
 *    le SDK Singer, qui épuise ses tentatives avant d'abandonner le run.
 *  - S2 : une date VALIDE en JavaScript mais hors plage MariaDB DATETIME
 *    (`+275760-09-13`, ou une année 0000) n'était filtrée nulle part : la requête posée
 *    au driver ne filtrait plus rien, et l'API rendait 200 avec les premières lignes du
 *    flux, comme si `since` n'avait jamais été fourni.
 *
 * Une seule fonction, partagée par les deux routes : deux implémentations de la même
 * validation auraient fini par diverger, exactement le défaut qui a produit S3.
 */
import { parseSince, BadSinceError } from '@/lib/datahub/since'

describe('parseSince', () => {
  it('rend null en l\'absence de borne — pas de filtre', () => {
    expect(parseSince(null)).toBeNull()
  })

  it('parse une date ISO valide', () => {
    expect(parseSince('2026-07-01T00:00:00.000Z')).toEqual(new Date('2026-07-01T00:00:00.000Z'))
  })

  it('refuse une borne illisible par une erreur typée (S3)', () => {
    expect(() => parseSince('pas-une-date')).toThrow(BadSinceError)
    expect(() => parseSince('2026-01-01\' OR \'1\'=\'1')).toThrow(BadSinceError)
  })

  it('refuse une date hors plage MariaDB DATETIME, même valide en JavaScript (S2)', () => {
    // MariaDB DATETIME va de l'an 1000 à 9999. `+275760-09-13` est une date JS légale
    // (jusqu'à ~275760) mais un `WHERE updated_at >= ...` avec cette valeur ne filtre
    // plus rien côté MySQL — l'API rendait 200 avec les premières lignes du flux.
    expect(() => parseSince('+275760-09-13T00:00:00.000Z')).toThrow(BadSinceError)
    expect(() => parseSince('0000-01-01T00:00:00.000Z')).toThrow(BadSinceError)
  })

  it('accepte les bornes de la plage MariaDB', () => {
    expect(parseSince('1000-01-01T00:00:00.000Z')).toBeInstanceOf(Date)
    expect(parseSince('9999-12-31T23:59:59.000Z')).toBeInstanceOf(Date)
  })
})
