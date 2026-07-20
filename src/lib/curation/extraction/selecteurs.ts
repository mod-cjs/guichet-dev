import { parseDocument } from 'htmlparser2'
import { selectOne } from 'css-select'
import { textContent, getAttributeValue } from 'domutils'
import type { Element, AnyNode } from 'domhandler'
import type { ChampsExtraits } from './types'
import { nettoyerTexte } from './html-texte'
import { parseDateFr } from './dates'

/**
 * GUIC-598 — US-3 : extraction par sélecteurs CSS configurables par source.
 * Syntaxe : `sel` → texte de l'élément ; `sel@attr` → valeur d'attribut.
 * Moteur : htmlparser2 (DOM) + css-select (requête). Champs pris en charge :
 * titre, description, organisation, region, domaine, deadline.
 */

const CHAMPS_AUTORISES = ['titre', 'description', 'organisation', 'region', 'domaine', 'deadline'] as const
type Champ = (typeof CHAMPS_AUTORISES)[number]

function valeur(doc: AnyNode[] | AnyNode, expr: string): string | undefined {
  const [sel, attr] = expr.split('@')
  let el: Element | null
  try {
    el = selectOne(sel.trim(), doc)
  } catch {
    return undefined // sélecteur invalide → champ ignoré
  }
  if (!el) return undefined
  const brut = attr ? getAttributeValue(el, attr.trim()) : textContent(el)
  const t = nettoyerTexte(brut)
  return t || undefined
}

export function extraireParSelecteurs(
  html: string,
  champs: Record<string, string>,
): Partial<ChampsExtraits> {
  const doc = parseDocument(html)
  const out: Partial<ChampsExtraits> = {}
  for (const champ of CHAMPS_AUTORISES) {
    const expr = champs[champ]
    if (!expr) continue
    const v = valeur(doc, expr)
    if (!v) continue
    if (champ === 'deadline') {
      const iso = parseDateFr(v)
      if (iso) out.deadline = iso
    } else {
      out[champ as Exclude<Champ, 'deadline'>] = v
    }
  }
  return out
}
