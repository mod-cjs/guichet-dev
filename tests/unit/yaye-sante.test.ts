/**
 * GUIC-435 (Phase 4 — Santé de Yaye) — dérivation des ALERTES OPÉRATIONNELLES à partir des
 * signaux agrégés (régression qualité, escalades au-delà du SLA, dérive de calibration).
 * Fonction PURE ; l'agrégation DB est testée en intégration. Pas d'alerte fabriquée : chaque
 * alerte est adossée à un signal réel.
 */
import { deriverAlertesSante, type SanteSignaux } from '@/lib/ia/admin/sante'

const base: SanteSignaux = {
  regressed: false,
  escaladesSlaDepassees: 0,
  escaladesDangerOuvertes: 0,
  calibrationDrift: null,
}

describe('GUIC-435 — deriverAlertesSante', () => {
  it('tout va bien → aucune alerte', () => {
    expect(deriverAlertesSante(base)).toEqual([])
  })

  it('régression qualité → alerte critique', () => {
    const a = deriverAlertesSante({ ...base, regressed: true })
    expect(a).toHaveLength(1)
    expect(a[0].niveau).toBe('critique')
    expect(a[0].message).toMatch(/qualité/i)
  })

  it('escalade danger au-delà du SLA → alerte critique', () => {
    const a = deriverAlertesSante({ ...base, escaladesSlaDepassees: 3, escaladesDangerOuvertes: 2 })
    expect(a.some((x) => x.niveau === 'critique' && /SLA/i.test(x.message))).toBe(true)
  })

  it('escalade SLA dépassé mais sans danger → alerte warn (pas critique)', () => {
    const a = deriverAlertesSante({ ...base, escaladesSlaDepassees: 2, escaladesDangerOuvertes: 0 })
    const sla = a.find((x) => /SLA/i.test(x.message))
    expect(sla?.niveau).toBe('warn')
  })

  it('dérive de calibration forte → alerte warn', () => {
    const a = deriverAlertesSante({ ...base, calibrationDrift: 0.5 })
    expect(a.some((x) => x.niveau === 'warn' && /calibration/i.test(x.message))).toBe(true)
  })

  it('cumul → alertes triées critique d’abord', () => {
    const a = deriverAlertesSante({ regressed: true, escaladesSlaDepassees: 1, escaladesDangerOuvertes: 0, calibrationDrift: 0.5 })
    expect(a[0].niveau).toBe('critique')
    expect(a.length).toBeGreaterThanOrEqual(3)
  })
})
