/**
 * GUIC-597 — US-2 : extraction déterministe des liens candidats (découverte).
 * On teste le VRAI parsing sur des fixtures d'octets réels (RSS/Atom/sitemap/HTML).
 * Périmètre US-2 = liste d'URLs, PAS l'extraction de champs (US-3).
 */
import {
  extraireLiensRss,
  extraireLiensSitemap,
  extraireLiensHtml,
  ressembleAFlux,
} from '@/lib/curation/robot/parse'

describe('GUIC-597 — parse RSS/Atom', () => {
  const RSS = `<?xml version="1.0"?>
  <rss version="2.0"><channel>
    <title>Offres</title>
    <item><title>Stage compta</title><link>https://exemple.sn/offres/1</link></item>
    <item><title>Bourse</title><link>https://exemple.sn/offres/2?ref=rss</link></item>
  </channel></rss>`

  const ATOM = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>A</title><link href="https://exemple.sn/a" rel="alternate"/></entry>
    <entry><title>B</title><link href="/relatif/b" /></entry>
  </feed>`

  it('extrait les <link> d’un flux RSS', () => {
    expect(extraireLiensRss(RSS, 'https://exemple.sn')).toEqual([
      'https://exemple.sn/offres/1',
      'https://exemple.sn/offres/2?ref=rss',
    ])
  })

  it('extrait les <link href> Atom et résout le relatif contre la base', () => {
    expect(extraireLiensHtml).toBeDefined()
    expect(extraireLiensRss(ATOM, 'https://exemple.sn')).toEqual([
      'https://exemple.sn/a',
      'https://exemple.sn/relatif/b',
    ])
  })

  it('ne renvoie pas de doublon', () => {
    const dup = `<rss><channel>
      <item><link>https://exemple.sn/x</link></item>
      <item><link>https://exemple.sn/x</link></item>
    </channel></rss>`
    expect(extraireLiensRss(dup, 'https://exemple.sn')).toEqual(['https://exemple.sn/x'])
  })
})

describe('GUIC-597 — parse sitemap', () => {
  const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://exemple.sn/emploi/10</loc></url>
    <url><loc>https://exemple.sn/emploi/11</loc></url>
  </urlset>`

  it('extrait les <loc>', () => {
    expect(extraireLiensSitemap(SITEMAP, 'https://exemple.sn')).toEqual([
      'https://exemple.sn/emploi/10',
      'https://exemple.sn/emploi/11',
    ])
  })
})

describe('GUIC-597 — parse listing HTML (ancres, filtre par motif)', () => {
  const HTML = `<html><body>
    <nav><a href="/">Accueil</a><a href="/contact">Contact</a></nav>
    <ul class="offres">
      <li><a href="/offres/100">Offre 100</a></li>
      <li><a href="https://exemple.sn/offres/101">Offre 101</a></li>
      <li><a href="/blog/article">Article</a></li>
    </ul>
  </body></html>`

  it('extrait toutes les ancres résolues en absolu, sans doublon', () => {
    const liens = extraireLiensHtml(HTML, 'https://exemple.sn/liste')
    expect(liens).toContain('https://exemple.sn/offres/100')
    expect(liens).toContain('https://exemple.sn/offres/101')
    expect(liens).toContain('https://exemple.sn/contact')
  })

  it('filtre par motif de lien quand fourni (config source)', () => {
    const liens = extraireLiensHtml(HTML, 'https://exemple.sn/liste', '/offres/')
    expect(liens).toEqual([
      'https://exemple.sn/offres/100',
      'https://exemple.sn/offres/101',
    ])
  })

  it('ignore les ancres sans href exploitable (#, javascript:, mailto:)', () => {
    const h = `<a href="#">x</a><a href="javascript:void(0)">y</a><a href="mailto:a@b.sn">z</a><a href="/offres/9">ok</a>`
    expect(extraireLiensHtml(h, 'https://exemple.sn', '/offres/')).toEqual([
      'https://exemple.sn/offres/9',
    ])
  })
})

// ─── Durcissement post-challenge (2026-07-20) ────────────────────────────────

describe('GUIC-597 — durcissement : RSS ≠ HTML <link>', () => {
  it('extraireLiensRss n’attrape PAS les <link> HTML (stylesheet/canonical/favicon)', () => {
    const page = `<html><head>
      <link rel="stylesheet" href="https://exemple.sn/style.css">
      <link rel="canonical" href="https://exemple.sn/canonique">
      <link rel="icon" href="/favicon.ico">
    </head><body><a href="/offres/1">o</a></body></html>`
    // Aucune de ces balises n'est dans un <item>/<entry> → 0 lien de flux.
    expect(extraireLiensRss(page, 'https://exemple.sn')).toEqual([])
  })

  it('ressembleAFlux distingue un vrai flux d’une page HTML', () => {
    expect(ressembleAFlux('<?xml?><rss><channel></channel></rss>')).toBe(true)
    expect(ressembleAFlux('<?xml?><feed xmlns="...">')).toBe(true)
    expect(ressembleAFlux('<!doctype html><html><head><link rel="stylesheet">')).toBe(false)
  })

  it('exclut le <link> du <channel> (self-link du flux)', () => {
    const rss = `<rss><channel>
      <link>https://exemple.sn/</link>
      <item><link>https://exemple.sn/vraie-offre</link></item>
    </channel></rss>`
    expect(extraireLiensRss(rss, 'https://exemple.sn')).toEqual(['https://exemple.sn/vraie-offre'])
  })
})

describe('GUIC-597 — durcissement : anti-ReDoS (parsing borné)', () => {
  it('un <link> non fermé suivi de milliers d’espaces se parse instantanément', () => {
    const hostile = '<link>' + ' '.repeat(20000) + '!'
    const t0 = Date.now()
    const out = extraireLiensRss(hostile, 'https://exemple.sn')
    // Regex linéaire bornée : < 200 ms (l'ancienne version prenait plusieurs secondes).
    expect(Date.now() - t0).toBeLessThan(200)
    expect(out).toEqual([])
  })

  it('tronque les URLs > 500 caractères (colonne VARCHAR(500))', () => {
    const longue = 'https://exemple.sn/offres/' + 'x'.repeat(600)
    const html = `<a href="${longue}">trop long</a><a href="/offres/ok">ok</a>`
    const liens = extraireLiensHtml(html, 'https://exemple.sn', '/offres/')
    expect(liens).toEqual(['https://exemple.sn/offres/ok'])
  })
})
