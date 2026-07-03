/**
 * @jest-environment node
 *
 * GUIC-505 — Helpers purs du contenu riche (isRichHtml + htmlToPlainText).
 * htmlToPlainText alimente les meta SEO / aperçus : l'HTML riche ne doit pas
 * fuiter dans une balise <meta description>.
 */
import { htmlToPlainText, isRichHtml } from '@/lib/rich-html'

describe('GUIC-505 — htmlToPlainText', () => {
  it('retire les balises et normalise les espaces', () => {
    const out = htmlToPlainText('<h2>Titre</h2><p>Un <strong>rôle</strong> clé.</p><ul><li>a</li><li>b</li></ul>')
    expect(out).toBe('Titre Un rôle clé. a b')
  })

  it('décode les entités courantes', () => {
    expect(htmlToPlainText('<p>Dupont &amp; Fils &lt;3</p>')).toBe('Dupont & Fils <3')
  })

  it('convertit <br> en espace', () => {
    expect(htmlToPlainText('Ligne 1<br>Ligne 2')).toBe('Ligne 1 Ligne 2')
  })

  it('renvoie du texte plat inchangé (hors espaces) et gère le vide', () => {
    expect(htmlToPlainText('Texte brut simple')).toBe('Texte brut simple')
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
  })

  it('produit une meta description tronquable sans balise', () => {
    const meta = htmlToPlainText('<p>Description <em>riche</em> assez longue…</p>').slice(0, 160)
    expect(meta).not.toMatch(/[<>]/)
    expect(meta).toContain('Description riche')
  })
})

describe('GUIC-505 — isRichHtml (rappel)', () => {
  it('distingue HTML riche et texte plat', () => {
    expect(isRichHtml('<p>x</p>')).toBe(true)
    expect(isRichHtml('a < b et c > d')).toBe(false)
  })
})
