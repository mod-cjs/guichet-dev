import { stepIdentiteSchema, validateIdentiteProfil } from './onboarding'

describe('stepIdentiteSchema — messages FR (GUIC-443)', () => {
  const base = { nom: 'Diallo', prenom: 'Awa', dateNaissance: '1999-03-10', genre: 'F' as const }

  it('accepte une identité complète', () => {
    expect(stepIdentiteSchema.safeParse(base).success).toBe(true)
  })

  it('nom trop court → message FR (pas le Zod anglais brut)', () => {
    const r = stepIdentiteSchema.safeParse({ ...base, nom: 'D' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === 'nom')?.message ?? ''
      expect(msg).not.toMatch(/String must contain/i)
      expect(msg.toLowerCase()).toContain('nom')
    }
  })

  it('date de naissance absente → bloquante avec message FR (GUIC-442)', () => {
    const r = stepIdentiteSchema.safeParse({ ...base, dateNaissance: null })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === 'dateNaissance')?.message ?? ''
      expect(msg.toLowerCase()).toMatch(/obligatoire|date/)
    }
  })
})

describe('validateIdentiteProfil — genre tri-state (GUIC-442)', () => {
  const base = { nom: 'Diallo', prenom: 'Awa', dateNaissance: '1999-03-10', genre: 'F' as const }

  it('identité complète → aucune erreur', () => {
    expect(validateIdentiteProfil(base)).toEqual({})
  })

  it('genre non choisi (null) → erreur bloquante "obligatoire"', () => {
    const errs = validateIdentiteProfil({ ...base, genre: null })
    expect(errs.genre).toMatch(/obligatoire/i)
  })

  it('genre "Autre" (Non précisé) → choix valide, pas d\'erreur genre', () => {
    const errs = validateIdentiteProfil({ ...base, genre: 'Autre' })
    expect(errs.genre).toBeUndefined()
  })

  it('date de naissance vide → erreur bloquante', () => {
    const errs = validateIdentiteProfil({ ...base, dateNaissance: '' })
    expect(errs.dateNaissance).toBeTruthy()
  })

  it('nom vide → erreur FR (pas le message Zod anglais)', () => {
    const errs = validateIdentiteProfil({ ...base, nom: '' })
    expect(errs.nom).toBeTruthy()
    expect(errs.nom).not.toMatch(/String must contain/i)
  })
})
