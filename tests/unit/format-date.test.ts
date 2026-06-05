import { formatDeadline, formatDeadlineFull } from '@/lib/format-date'

describe('formatDeadline()', () => {
  const NOW = new Date('2026-06-01T00:00:00.000Z')

  it("retourne 'Sans échéance' quand iso est null", () => {
    expect(formatDeadline(null, NOW)).toBe('Sans échéance')
  })

  it("retourne 'Sans échéance' quand iso est undefined", () => {
    expect(formatDeadline(undefined, NOW)).toBe('Sans échéance')
  })

  it('formate sans année quand année courante', () => {
    const out = formatDeadline('2026-06-12T00:00:00.000Z', NOW)
    expect(out).toMatch(/12 juin$/)
    expect(out).not.toMatch(/2026/)
  })

  it('formate avec année quand année différente', () => {
    const out = formatDeadline('2027-06-12T00:00:00.000Z', NOW)
    expect(out).toMatch(/2027/)
    expect(out).toMatch(/12 juin/)
  })

  it('renvoie une chaîne vide pour un ISO invalide', () => {
    expect(formatDeadline('not-a-date', NOW)).toBe('')
  })
})

describe('formatDeadlineFull()', () => {
  it('inclut toujours année, mois et jour', () => {
    expect(formatDeadlineFull('2026-06-12T00:00:00.000Z')).toMatch(/12 juin 2026/)
    expect(formatDeadlineFull('2027-12-31T00:00:00.000Z')).toMatch(/31 décembre 2027/)
  })

  it("retourne '' pour null/invalid", () => {
    expect(formatDeadlineFull(null)).toBe('')
    expect(formatDeadlineFull('bad')).toBe('')
  })
})
