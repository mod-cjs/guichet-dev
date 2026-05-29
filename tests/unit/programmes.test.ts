import { PROGRAMMES, getProgramme } from '@/lib/programmes'

describe('programmes', () => {
  it('expose les 4 programmes sectoriels CJS (BRM est un outil interne, pas un programme)', () => {
    expect(Object.keys(PROGRAMMES)).toEqual(['yaakaar', 'yeah', 'yjc', 'edupop'])
  })
  it('ne contient pas BRM (outil interne Beneficiary Relationship Management)', () => {
    expect('brm' in PROGRAMMES).toBe(false)
    expect(getProgramme('brm')).toBeNull()
  })
  it('chaque programme a un gradient token --prog-*', () => {
    Object.values(PROGRAMMES).forEach(p => {
      expect(p.gradientToken).toMatch(/^var\(--prog-\w+\)$/)
    })
  })
  it('getProgramme retourne null pour un id inconnu', () => {
    expect(getProgramme('inexistant')).toBeNull()
  })
  it('getProgramme retourne le programme attendu', () => {
    expect(getProgramme('yeah')?.nom).toBe('YEAH')
  })
})
