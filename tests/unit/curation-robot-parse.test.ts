/**
 * GUIC-597 — US-2 : extraction déterministe des liens candidats (découverte).
 * On teste le VRAI parsing sur des fixtures d'octets réels (RSS/Atom/sitemap/HTML).
 * Périmètre US-2 = liste d'URLs, PAS l'extraction de champs (US-3).
 */
import {
  extraireLiensRss,
  extraireLiensSitemap,
  extraireLiensHtml,
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
