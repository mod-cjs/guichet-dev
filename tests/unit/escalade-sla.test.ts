/**
 * GUIC-259 — SLA d'escalade Yaye (Phase 1). Le délai de traitement est DÉRIVÉ (pas de
 * colonne stockée, pour éviter un champ mort comme le statut en_retard biblio) : échéance =
 * createdAt + SLA selon la priorité (danger = court). Une escalade non résolue dont
 * l'échéance est passée est « en retard SLA ».
 */
import { SLA_MINUTES, echeanceSla, enRetardSla } from '@/lib/ia/escalade-sla'

const NOW = new Date('2026-08-18T12:00:00Z')
const il2h = new Date('2026-08-18T10:00:00Z')
const il40min = new Date('2026-08-18T11:20:00Z')

describe('GUIC-259 — SLA escalade (dérivé)', () => {
  it('danger (priorité 1) : SLA court', () => {
    expect(SLA_MINUTES[1]).toBeLessThanOrEqual(60)
    expect(echeanceSla(1, il40min).getTime()).toBe(il40min.getTime() + SLA_MINUTES[1] * 60_000)
  })

  it('normal (priorité 0) : SLA long', () => {
    expect(SLA_MINUTES[0]).toBeGreaterThan(SLA_MINUTES[1])
  })

  it('escalade danger ouverte depuis > SLA → en retard SLA', () => {
    expect(enRetardSla({ statut: 'en_attente', priorite: 1, createdAt: il40min }, NOW)).toBe(true)
  })

  it('escalade danger récente (< SLA) → pas en retard', () => {
    const recent = new Date(NOW.getTime() - 5 * 60_000)
    expect(enRetardSla({ statut: 'en_attente', priorite: 1, createdAt: recent }, NOW)).toBe(false)
  })

  it('escalade normale ouverte depuis 2h (< SLA normal) → pas en retard', () => {
    expect(enRetardSla({ statut: 'prise_en_charge', priorite: 0, createdAt: il2h }, NOW)).toBe(false)
  })

  it('escalade résolue → jamais en retard SLA (même si vieille)', () => {
    expect(enRetardSla({ statut: 'resolue', priorite: 1, createdAt: il2h }, NOW)).toBe(false)
  })
})
