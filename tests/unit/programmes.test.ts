import { PROGRAMMES, getProgramme } from '@/lib/programmes'

describe('programmes', () => {
  it('expose les 5 programmes CJS', () => {
    expect(Object.keys(PROGRAMMES)).toEqual(['yaakaar', 'yeah', 'yjc', 'brm', 'edupop'])
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
