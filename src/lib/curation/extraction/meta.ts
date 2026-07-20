import type { ChampsExtraits } from './types'
import { nettoyerTexte } from './html-texte'

/**
 * GUIC-598 — US-3 : métadonnées génériques (Open Graph, meta description, <title>, h1).
 * Filet après JSON-LD et sélecteurs. Regex bornées (anti-ReDoS).
 */

function contenuMeta(html: string, cle: 'property' | 'name', valeur: string): string | undefined {
  // <meta property="og:title" content="..."> dans les deux ordres d'attributs.
  const re1 = new RegExp(
    `<meta\\b[^>]{0,300}\\b${cle}\\s*=\\s*["']${valeur}["'][^>]{0,300}\\bcontent\\s*=\\s*["']([^"']{0,2000})["']`,
    'i',
  )
  const re2 = new RegExp(
    `<meta\\b[^>]{0,300}\\bcontent\\s*=\\s*["']([^"']{0,2000})["'][^>]{0,300}\\b${cle}\\s*=\\s*["']${valeur}["']`,
    'i',
  )
  const m = html.match(re1) ?? html.match(re2)
  const t = m ? nettoyerTexte(m[1]) : ''
  return t || undefined
}

export function extraireMeta(html: string): Partial<ChampsExtraits> {
  const out: Partial<ChampsExtraits> = {}

  const titre =
    contenuMeta(html, 'property', 'og:title') ??
    contenuMeta(html, 'name', 'twitter:title') ??
    titreBalise(html) ??
    premierH1(html)
  if (titre) out.titre = titre

  const description =
    contenuMeta(html, 'property', 'og:description') ?? contenuMeta(html, 'name', 'description')
  if (description) out.description = description

  const org = contenuMeta(html, 'property', 'og:site_name')
  if (org) out.organisation = org

  return out
}

function titreBalise(html: string): string | undefined {
  const m = html.match(/<title\b[^>]{0,200}>([\s\S]{0,300}?)<\/title>/i)
  const t = m ? nettoyerTexte(m[1]) : ''
  return t || undefined
}

function premierH1(html: string): string | undefined {
  const m = html.match(/<h1\b[^>]{0,300}>([\s\S]{0,500}?)<\/h1>/i)
  const t = m ? nettoyerTexte(m[1]) : ''
  return t || undefined
}
