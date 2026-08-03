/**
 * M13 / Data Hub — curseur d'extraction (lot 4, spec §8.2).
 *
 * Le curseur porte une position dans le tri `(watermark, clé primaire)`, pas un rang.
 * C'est ce qui rend la pagination correcte sous écriture concurrente : avec un offset,
 * une insertion pendant l'extraction décale les pages et une ligne passe entre deux
 * pages sans jamais être lue — sans erreur, sans trace.
 *
 * Il est opaque mais pas secret : un curseur forgé ne donne accès qu'à des données déjà
 * autorisées pour la clé appelante. Ce qui compte est la validation stricte — un curseur
 * malformé doit produire un refus net, jamais dégénérer en scan complet de la table.
 */
import { encodeCursor, decodeCursor, BadCursorError } from '@/lib/datahub/cursor'

describe('curseur — aller-retour', () => {
  it('restitue exactement la position encodée', () => {
    const position = { t: '2026-07-30T12:00:00.000Z', i: 'abc-123' }
    expect(decodeCursor(encodeCursor(position))).toEqual(position)
  })

  it('préserve la précision milliseconde du watermark', () => {
    // MariaDB stocke les DateTime en précision 3 : perdre les millisecondes ferait
    // relire ou sauter les lignes écrites dans la même seconde.
    const position = { t: '2026-07-30T12:00:00.427Z', i: 'x' }
    expect(decodeCursor(encodeCursor(position)).t).toBe('2026-07-30T12:00:00.427Z')
  })

  it('préserve sans perte un identifiant numérique hors des entiers sûrs', () => {
    // `consultations.id` est un BigInt : le passer par un Number le tronquerait.
    const grand = '90071992547409919'
    expect(decodeCursor(encodeCursor({ t: '2026-01-01T00:00:00.000Z', i: grand })).i).toBe(grand)
  })

  it('produit une valeur URL-safe, transportable en query string', () => {
    const encode = encodeCursor({ t: '2026-07-30T12:00:00.000Z', i: 'a/b+c=d' })
    expect(encode).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('n\'affiche pas la position en clair', () => {
    expect(encodeCursor({ t: '2026-07-30T12:00:00.000Z', i: 'abc' })).not.toContain('2026')
  })
})

describe('curseur — validation stricte', () => {
  const refuse = (raw: string) => expect(() => decodeCursor(raw)).toThrow(BadCursorError)

  it('refuse une chaîne qui n\'est pas du base64url', () => refuse('###'))
  it('refuse un base64 qui ne porte pas de JSON', () => refuse(Buffer.from('pas du json').toString('base64url')))
  it('refuse un JSON qui n\'est pas un objet', () => refuse(Buffer.from('[1,2]').toString('base64url')))
  it('refuse un curseur sans watermark', () => refuse(Buffer.from('{"i":"a"}').toString('base64url')))
  it('refuse un curseur sans clé primaire', () => refuse(Buffer.from('{"t":"2026-01-01T00:00:00.000Z"}').toString('base64url')))
  it('refuse un watermark qui n\'est pas une date', () => refuse(Buffer.from('{"t":"hier","i":"a"}').toString('base64url')))
  it('refuse une clé primaire non textuelle', () => refuse(Buffer.from('{"t":"2026-01-01T00:00:00.000Z","i":42}').toString('base64url')))
  it('refuse une chaîne vide', () => refuse(''))

  it('signale l\'erreur par un type dédié, pour que la route rende 400 et non 500', () => {
    try {
      decodeCursor('###')
      throw new Error('aurait dû lever')
    } catch (e) {
      expect(e).toBeInstanceOf(BadCursorError)
      expect((e as Error).message).toMatch(/curseur/i)
    }
  })
})
