import type { ChampsExtraits } from './types'
import { nettoyerTexte } from './html-texte'
import { parseDateFr } from './dates'

/**
 * GUIC-598 — US-3 : extraction schema.org JSON-LD (le plus fiable → tenté en premier).
 * Sans dépendance : on isole les `<script type="application/ld+json">` puis `JSON.parse`.
 * Un bloc invalide est ignoré (pas de crash). Gère `@graph` et les tableaux.
 */

const TYPES_CIBLES = new Set([
  'jobposting',
  'event',
  'educationaloccupationalprogram',
  'course',
  'grant',
  'scholarship',
])

const PROFONDEUR_MAX = 8 // borne anti stack-overflow sur JSON-LD hostile imbriqué

function texte(v: unknown, prof = 0): string | undefined {
  if (prof > PROFONDEUR_MAX) return undefined
  if (typeof v === 'string') {
    const t = nettoyerTexte(v)
    return t || undefined
  }
  if (v && typeof v === 'object' && 'name' in v) {
    return texte((v as { name: unknown }).name, prof + 1)
  }
  return undefined
}

function premierNom(v: unknown, prof = 0): string | undefined {
  if (prof > PROFONDEUR_MAX) return undefined
  if (Array.isArray(v)) {
    for (const e of v) {
      const t = texte(e, prof + 1)
      if (t) return t
    }
    return undefined
  }
  return texte(v, prof)
}

function typeCorrespond(t: unknown): boolean {
  const arr = Array.isArray(t) ? t : [t]
  return arr.some((x) => typeof x === 'string' && TYPES_CIBLES.has(x.toLowerCase()))
}

function aplatir(obj: unknown, sortie: Record<string, unknown>[]): void {
  if (Array.isArray(obj)) {
    for (const e of obj) aplatir(e, sortie)
    return
  }
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    if ('@graph' in o) aplatir(o['@graph'], sortie)
    if ('@type' in o) sortie.push(o)
  }
}

function mapper(o: Record<string, unknown>): Partial<ChampsExtraits> {
  const c: Partial<ChampsExtraits> = {}
  const titre = texte(o.title) ?? texte(o.name)
  if (titre) c.titre = titre
  const desc = texte(o.description)
  if (desc) c.description = desc
  const org = premierNom(o.hiringOrganization) ?? premierNom(o.organizer) ?? premierNom(o.provider)
  if (org) c.organisation = org

  // Région : jobLocation.address.addressRegion | location…
  const loc = (o.jobLocation ?? o.location) as unknown
  const region = extraireRegion(loc)
  if (region) c.region = region

  const domaine = texte(o.industry) ?? premierNom(o.occupationalCategory)
  if (domaine) c.domaine = domaine

  const deadline =
    parseDateFr(asString(o.validThrough)) ??
    parseDateFr(asString(o.applicationDeadline)) ??
    parseDateFr(asString(o.endDate))
  if (deadline) c.deadline = deadline
  return c
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function extraireRegion(loc: unknown, prof = 0): string | undefined {
  if (prof > PROFONDEUR_MAX) return undefined
  if (Array.isArray(loc)) {
    for (const e of loc) {
      const r = extraireRegion(e, prof + 1)
      if (r) return r
    }
    return undefined
  }
  if (loc && typeof loc === 'object') {
    const o = loc as Record<string, unknown>
    const addr = o.address as Record<string, unknown> | undefined
    return (
      texte(addr?.addressRegion) ??
      texte(addr?.addressLocality) ??
      texte(o.addressRegion) ??
      texte(o.name)
    )
  }
  return texte(loc)
}

/** Type schema.org brut (JobPosting, Event…) du premier objet ciblé — mappé en aval. */
export function extraireTypeSchemaOrg(html: string): string | undefined {
  const objets: Record<string, unknown>[] = []
  for (const m of html.matchAll(
    /<script\b[^>]{0,300}\btype\s*=\s*["']application\/ld\+json["'][^>]{0,300}>([\s\S]{0,100000}?)<\/script>/gi,
  )) {
    try {
      aplatir(JSON.parse(m[1].trim()), objets)
    } catch {
      /* ignoré */
    }
  }
  const cible = objets.find((o) => typeCorrespond(o['@type']))
  const t = cible?.['@type']
  const val = Array.isArray(t) ? t.find((x) => typeof x === 'string') : t
  return typeof val === 'string' ? val : undefined
}

export function extraireJsonLd(html: string): Partial<ChampsExtraits> {
  const objets: Record<string, unknown>[] = []
  for (const m of html.matchAll(
    /<script\b[^>]{0,300}\btype\s*=\s*["']application\/ld\+json["'][^>]{0,300}>([\s\S]{0,100000}?)<\/script>/gi,
  )) {
    try {
      aplatir(JSON.parse(m[1].trim()), objets)
    } catch {
      /* bloc JSON-LD invalide → ignoré */
    }
  }
  // Priorité aux types "opportunité" ; sinon premier objet nommé.
  const cible = objets.find((o) => typeCorrespond(o['@type'])) ?? objets.find((o) => o.title || o.name)
  return cible ? mapper(cible) : {}
}
