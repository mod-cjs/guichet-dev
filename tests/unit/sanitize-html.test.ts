/**
 * @jest-environment node
 *
 * GUIC-506 — Sanitisation serveur du contenu riche (liste blanche, anti-XSS).
 * Le corps descriptif est saisi par des tiers (recruteurs, conseillers) : toute
 * balise/attribut hors liste blanche doit être neutralisé AVANT persistance.
 */
import { sanitizeRichHtml, isRichHtml } from '@/lib/sanitize-html'

describe('GUIC-506 — sanitizeRichHtml : balises autorisées', () => {
  it('conserve la mise en forme bridée CJS', () => {
    const input =
      '<h2>Titre</h2><p><strong>Gras</strong> et <em>italique</em></p>' +
      '<ul><li>un</li><li>deux</li></ul><ol><li>a</li></ol><blockquote>cit</blockquote>'
    const out = sanitizeRichHtml(input)
    expect(out).toContain('<h2>Titre</h2>')
    expect(out).toContain('<strong>Gras</strong>')
    expect(out).toContain('<em>italique</em>')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>un</li>')
    expect(out).toContain('<ol>')
    expect(out).toContain('<blockquote>')
  })

  it('conserve les liens mais force rel/target sûrs', () => {
    const out = sanitizeRichHtml('<a href="https://cjs.sn">lien</a>')
    expect(out).toContain('href="https://cjs.sn"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  it('conserve les images https sans handlers', () => {
    const out = sanitizeRichHtml('<img src="https://cdn.cjs.sn/a.webp" alt="visuel">')
    expect(out).toContain('src="https://cdn.cjs.sn/a.webp"')
    expect(out).toContain('alt="visuel"')
  })
})

describe('GUIC-506 — sanitizeRichHtml : anti-XSS', () => {
  it('supprime les balises <script>', () => {
    const out = sanitizeRichHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toContain('alert(1)')
    expect(out).toContain('<p>ok</p>')
  })

  it('supprime les handlers inline on*', () => {
    const out = sanitizeRichHtml('<img src="https://x.sn/a.png" onerror="alert(1)">')
    expect(out).not.toMatch(/onerror/i)
    expect(out).not.toContain('alert(1)')
  })

  it('neutralise les hrefs javascript:', () => {
    const out = sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toMatch(/javascript:/i)
  })

  it('rejette les images data: non contrôlées', () => {
    const out = sanitizeRichHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">')
    expect(out).not.toContain('data:text/html')
  })

  it('supprime <iframe> et <style>', () => {
    const out = sanitizeRichHtml('<iframe src="https://evil.sn"></iframe><style>*{}</style><p>ok</p>')
    expect(out).not.toMatch(/<iframe/i)
    expect(out).not.toMatch(/<style/i)
    expect(out).toContain('<p>ok</p>')
  })

  it('supprime les styles inline (pas de couleur/police libre — bridage CJS)', () => {
    const out = sanitizeRichHtml('<p style="color:red;font-family:Comic Sans">x</p>')
    expect(out).not.toMatch(/style=/i)
    expect(out).toContain('<p>x</p>')
  })

  it('renvoie une chaîne vide pour une entrée vide ou nulle', () => {
    expect(sanitizeRichHtml('')).toBe('')
    expect(sanitizeRichHtml(null as unknown as string)).toBe('')
    expect(sanitizeRichHtml(undefined as unknown as string)).toBe('')
  })
})

describe('GUIC-505 — isRichHtml : détection HTML vs texte plat (fallback rendu)', () => {
  it('détecte du HTML riche', () => {
    expect(isRichHtml('<p>bonjour</p>')).toBe(true)
    expect(isRichHtml('texte <strong>gras</strong>')).toBe(true)
  })

  it('traite le texte plat (lignes existantes) comme non-HTML', () => {
    expect(isRichHtml('Une description en texte brut.\nAvec un retour ligne.')).toBe(false)
    expect(isRichHtml('')).toBe(false)
    expect(isRichHtml('Prix < 100 & remise > 0')).toBe(false)
  })
})
