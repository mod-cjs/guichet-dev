/**
 * @jest-environment node
 *
 * GUIC-465 (F3) — Sentinelles unitaires pour csvCell (export participants admin).
 * Couvre : virgule, guillemet, newline, injection de formule.
 */
import { csvCell } from '@/app/api/admin/evenements/[id]/participants/route'

describe('GUIC-465 — csvCell : échappement CSV', () => {
  it('valeur sans caractère spécial → renvoyée telle quelle', () => {
    expect(csvCell('Awa Diop')).toBe('Awa Diop')
  })

  it('virgule → valeur entourée de guillemets', () => {
    expect(csvCell('Dakar, Plateau')).toBe('"Dakar, Plateau"')
  })

  it('guillemet interne → doublé et valeur entourée de guillemets', () => {
    expect(csvCell('il dit "bonjour"')).toBe('"il dit ""bonjour"""')
  })

  it('newline → valeur entourée de guillemets', () => {
    expect(csvCell('ligne1\nligne2')).toBe('"ligne1\nligne2"')
  })

  it('point-virgule → valeur entourée de guillemets', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
  })

  it('injection de formule = → préfixe apostrophe', () => {
    const result = csvCell('=SUM(A1:A10)')
    expect(result).toBe("'=SUM(A1:A10)")
  })

  it('injection de formule + → préfixe apostrophe', () => {
    expect(csvCell('+cmd')).toBe("'+cmd")
  })

  it('injection de formule - → préfixe apostrophe', () => {
    expect(csvCell('-1+2')).toBe("'-1+2")
  })

  it('injection de formule @ → préfixe apostrophe', () => {
    expect(csvCell('@SUM()')).toBe("'@SUM()")
  })

  it('injection de formule tab → préfixe apostrophe', () => {
    expect(csvCell('\teval')).toBe("'\teval")
  })

  it('injection de formule CR → préfixe apostrophe', () => {
    expect(csvCell('\reval')).toBe("'\reval")
  })

  it('injection =SUM avec guillemet → apostrophe préfixée ET guillemets doublés', () => {
    // La chaîne commence par = (injection) ET contient des guillemets.
    const result = csvCell('=SUM("A1")')
    // Apostrophe ajoutée, puis les guillemets sont doublés et la valeur entourée.
    expect(result).toBe(`"'=SUM(""A1"")"`)
  })

  it('valeur vide → chaîne vide', () => {
    expect(csvCell('')).toBe('')
  })

  it('valeur undefined castée en string vide → chaîne vide', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(csvCell(undefined as any)).toBe('')
  })
})
