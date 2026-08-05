/**
 * GUIC-702 · PR-B (RED) — helpers purs du détail de modération (panneau slide-over).
 * Verbe d'historique lisible depuis l'action AuditLog + mapping d'une entrée.
 */
import { verbeModeration, mapHistoriqueEntry, champsSousType } from '@/lib/loaders/moderation-detail'

const NOW = new Date('2026-08-05T12:00:00Z')

describe('GUIC-702 — détail modération (helpers purs)', () => {
  it('verbeModeration traduit les actions AuditLog en libellés', () => {
    expect(verbeModeration('opportunite.approve')).toMatch(/approb/i)
    expect(verbeModeration('opportunite.reject')).toMatch(/rejet/i)
    expect(verbeModeration('opportunite.publish')).toMatch(/publi/i)
    expect(verbeModeration('opportunite.correction_demandee')).toMatch(/correction/i)
    expect(verbeModeration('opportunite.create')).toMatch(/cr[ée]ation/i)
    expect(verbeModeration('opportunite.update')).toMatch(/modif/i)
    // action inconnue → renvoyée telle quelle (jamais vide)
    expect(verbeModeration('opportunite.autre')).toBe('opportunite.autre')
  })

  it('mapHistoriqueEntry expose verbe, acteur, date et le motif depuis meta', () => {
    const e = mapHistoriqueEntry(
      {
        action: 'opportunite.reject',
        actorCjsUid: 'admin-123',
        meta: { statut: 'archivee', reason: 'Offre payante' },
        createdAt: new Date('2026-08-04T09:30:00Z'),
      },
      NOW,
    )
    expect(e.verbe).toMatch(/rejet/i)
    expect(e.actorLabel).toContain('admin-123')
    expect(e.detail).toBe('Offre payante')
    expect(typeof e.dateLabel).toBe('string')
    expect(e.dateLabel.length).toBeGreaterThan(0)
  })

  it('champsSousType — Formation : durée, certifiante, coût (écart E)', () => {
    const c = champsSousType({ formation: { dureeHeures: 120, certifiante: true, gratuite: false, fraisInscriptionFcfa: 10000 } })
    expect(c).toEqual(expect.arrayContaining([
      { label: 'Durée', value: '120 h' },
      { label: 'Certifiante', value: 'Oui' },
    ]))
    expect(c.find((x) => x.label === 'Coût')?.value).toMatch(/10\s?000/)
  })

  it('champsSousType — Bourse : montant + financeur', () => {
    const c = champsSousType({ bourse: { montantTotalFcfa: 5000000, organismeFinanceur: 'Fondation Sonatel', dureeMois: 12, paysDestination: null } })
    expect(c.find((x) => x.label === 'Financeur')?.value).toBe('Fondation Sonatel')
    expect(c.find((x) => x.label === 'Montant')?.value).toMatch(/5\s?000\s?000/)
  })

  it('champsSousType — aucun sous-type → liste vide', () => {
    expect(champsSousType({})).toEqual([])
  })

  it('mapHistoriqueEntry sans motif → detail null (pas de crash sur meta absent)', () => {
    const e = mapHistoriqueEntry(
      { action: 'opportunite.approve', actorCjsUid: 'x', meta: null, createdAt: new Date('2026-08-01T10:00:00Z') },
      NOW,
    )
    expect(e.detail).toBeNull()
    expect(e.verbe).toMatch(/approb/i)
  })
})
