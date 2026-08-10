/**
 * GUIC-704 · Lot 2 (RED) — helpers purs du loader de sources de veille (santé + mapping).
 */
import { santeSource, mapSourceRow, type SourceRawRow } from '@/lib/loaders/admin-sources'

const NOW = new Date('2026-08-05T12:00:00Z')

function raw(over: Partial<SourceRawRow> = {}): SourceRawRow {
  return {
    id: 's1',
    nom: 'Emploi.sn',
    url: 'https://demo.emploi.sn/flux',
    methode: 'auto',
    frequence: 'quotidienne',
    actif: true,
    typeDefautId: null,
    configExtraction: null,
    derniereVerifLe: new Date('2026-08-05T10:00:00Z'),
    derniereExecution: { statut: 'ok', nbNouveautes: 4, nbErreurs: 0, demarreLe: new Date('2026-08-05T10:00:00Z') },
    ...over,
  }
}

describe('GUIC-704 — loader sources (helpers purs)', () => {
  it('santeSource : jamais / ok / partiel / echec', () => {
    expect(santeSource(null)).toBe('jamais')
    expect(santeSource({ statut: 'ok' })).toBe('ok')
    expect(santeSource({ statut: 'partiel' })).toBe('partiel')
    expect(santeSource({ statut: 'erreur' })).toBe('echec')
  })

  it('mapSourceRow — source saine : santé ok, nb nouveautés, source active', () => {
    const r = mapSourceRow(raw(), NOW)
    expect(r.nom).toBe('Emploi.sn')
    expect(r.actif).toBe(true)
    expect(r.sante).toBe('ok')
    expect(r.nbNouveautes).toBe(4)
    expect(r.derniereCollecteLabel).toBeTruthy()
  })

  it('mapSourceRow — jamais collectée → santé « jamais », pas de crash', () => {
    const r = mapSourceRow(raw({ derniereVerifLe: null, derniereExecution: null }), NOW)
    expect(r.sante).toBe('jamais')
    expect(r.nbNouveautes).toBe(0)
    expect(r.derniereCollecteLabel).toMatch(/jamais/i)
  })

  it('mapSourceRow — exécution en erreur → santé « echec »', () => {
    const r = mapSourceRow(raw({ derniereExecution: { statut: 'erreur', nbNouveautes: 0, nbErreurs: 3, demarreLe: NOW } }), NOW)
    expect(r.sante).toBe('echec')
  })
})
