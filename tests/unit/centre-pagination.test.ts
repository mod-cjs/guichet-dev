/** GUIC-687 — pagination serveur des listes fiche centre : logique pure. */
import { parsePage, parseQuery, paginate, PAGE_SIZE } from '@/lib/centre-pagination'

describe('centre-pagination', () => {
  it('parsePage : entier ≥ 1, sinon 1', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-2')).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage(['4', '9'])).toBe(4)
  })

  it('parseQuery : trim + borné', () => {
    expect(parseQuery('  awa  ')).toBe('awa')
    expect(parseQuery(undefined)).toBe('')
    expect(parseQuery('x'.repeat(200)).length).toBe(100)
  })

  it('paginate : bornes correctes', () => {
    const p = paginate(30, 2, 12)
    expect(p).toMatchObject({ page: 2, totalPages: 3, skip: 12, from: 13, to: 24 })
  })

  it('paginate : page au-delà de la fin est ramenée', () => {
    const p = paginate(10, 99, 12)
    expect(p.page).toBe(1)
    expect(p.to).toBe(10)
  })

  it('paginate : total 0 → 1 page vide, from 0', () => {
    const p = paginate(0, 1)
    expect(p).toMatchObject({ page: 1, totalPages: 1, total: 0, from: 0, to: 0 })
  })

  it('paginate : dernière page partielle', () => {
    const p = paginate(25, 3, 12)
    expect(p).toMatchObject({ page: 3, from: 25, to: 25 })
  })

  it('PAGE_SIZE par défaut', () => {
    expect(PAGE_SIZE).toBe(12)
  })
})
