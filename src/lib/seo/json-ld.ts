/**
 * Helpers de données structurées Schema.org (JSON-LD) — GUIC-25 (M7 SEO).
 *
 * Purs et testables : ne dépendent que des données passées + `appUrl()`.
 * Le rendu se fait via `<JsonLd data={…} />` (src/components/seo/JsonLd.tsx).
 *
 * Règle : aucune clé `undefined` ne doit apparaître dans l'objet final
 * (`prune()` les retire) — Google ignore les propriétés vides mais on garde
 * un payload propre et déterministe.
 */
import { appUrl } from '@/lib/app-url'
import { htmlToPlainText } from '@/lib/rich-html'

export type JsonLdObject = Record<string, unknown>

const ORG_NAME = 'Consortium Jeunesse Sénégal'
const ORG_DESCRIPTION =
  'Portail numérique du Consortium Jeunesse Sénégal — opportunités, formations, événements et ressources pour les jeunes.'

/** Retire récursivement les clés `undefined`/`null` et les objets/arrays vides. */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value.map((v) => prune(v)).filter((v) => v !== undefined && v !== null)
    return arr as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pv = prune(v)
      if (pv === undefined || pv === null) continue
      if (typeof pv === 'string' && pv.length === 0) continue
      out[k] = pv
    }
    return out as unknown as T
  }
  return value
}

/** Coupe une description HTML en texte brut ≤ maxLen (défaut 300). */
function plainDescription(html: string | null | undefined, maxLen = 300): string {
  const txt = htmlToPlainText(html).trim()
  return txt.length > maxLen ? `${txt.slice(0, maxLen - 1).trimEnd()}…` : txt
}

/** Organization — injecté sur l'accueil public. */
export function organizationJsonLd(): JsonLdObject {
  const base = appUrl()
  return prune({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    alternateName: 'CJS',
    url: base,
    logo: `${base}/logo-guichet.png`,
    description: ORG_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Sénégal' },
  })
}

/** WebSite — active la SearchAction (boîte de recherche Google) sur l'accueil. */
export function webSiteJsonLd(): JsonLdObject {
  const base = appUrl()
  return prune({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Guichet Jeunesse CJS',
    url: base,
    inLanguage: 'fr',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/opportunites?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })
}

export interface BreadcrumbItem {
  name: string
  /** Chemin relatif (ex. `/opportunites`). Combiné à `appUrl()` en URL absolue. */
  path: string
}

/**
 * BreadcrumbList — fil d'Ariane structuré pour les pages de détail. Réutilise les
 * mêmes libellés/chemins que le composant `<Breadcrumbs>` visuel. Active
 * l'affichage du fil d'Ariane dans les résultats Google.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  const base = appUrl()
  return prune({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  })
}

/**
 * Extrait un `baseSalary` Schema.org (MonetaryAmount, devise XOF/FCFA) depuis
 * une rémunération en texte libre. Best-effort : retourne `undefined` si aucun
 * montant exploitable (ex. « Selon profil ») — Google ignore alors le champ.
 *
 * - Un seul montant → `value`. Deux montants ou plus → `minValue`/`maxValue`.
 * - Période déduite des mots-clés (an/mois/jour/heure), défaut MONTH.
 */
export function parseSalary(remuneration: string | null | undefined): JsonLdObject | undefined {
  if (!remuneration) return undefined
  const compact = remuneration.replace(/[\s  .]/g, '')
  const nums = [...compact.matchAll(/\d{3,}/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (nums.length === 0) return undefined

  const lower = remuneration.toLowerCase()
  const unitText = /\ban(?:s|née|nuel)?\b|year/.test(lower)
    ? 'YEAR'
    : /jour|\bday\b/.test(lower)
      ? 'DAY'
      : /heure|\bhour\b/.test(lower)
        ? 'HOUR'
        : 'MONTH'

  const value =
    nums.length >= 2
      ? {
          '@type': 'QuantitativeValue',
          minValue: Math.min(...nums),
          maxValue: Math.max(...nums),
          unitText,
        }
      : { '@type': 'QuantitativeValue', value: nums[0], unitText }

  return { '@type': 'MonetaryAmount', currency: 'XOF', value }
}

/** Types d'opportunité → `employmentType` Schema.org. */
const EMPLOYMENT_TYPE: Record<string, string> = {
  Emploi: 'FULL_TIME',
  Stage: 'INTERN',
  Formation: 'OTHER',
  Bourse: 'OTHER',
  Volontariat: 'VOLUNTEER',
  Appel_a_projets: 'OTHER',
}

export interface JobPostingInput {
  slug: string
  titre: string
  description: string | null
  type: string
  organisation: string
  organisationLibelle?: string | null
  region?: string | null
  remuneration?: string | null
  deadline?: Date | null
  createdAt: Date
}

/** JobPosting — injecté sur le détail d'une opportunité publiée. */
export function jobPostingJsonLd(o: JobPostingInput): JsonLdObject {
  const base = appUrl()
  const region = o.region ? o.region.replace(/_/g, ' ') : undefined
  return prune({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: o.titre,
    description: plainDescription(o.description, 5000),
    datePosted: o.createdAt.toISOString(),
    validThrough: o.deadline ? o.deadline.toISOString() : undefined,
    employmentType: EMPLOYMENT_TYPE[o.type] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: o.organisationLibelle || o.organisation,
    },
    // jobLocation toujours présent (requis Google) : au minimum le pays.
    // Les régions sénégalaises servent aussi de `addressLocality` (le nom de
    // région correspond en pratique à la ville principale) → moins de warnings.
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: region,
        addressRegion: region,
        addressCountry: 'SN',
      },
    },
    baseSalary: parseSalary(o.remuneration),
    directApply: false,
    url: `${base}/opportunites/${o.slug}`,
  })
}

export interface EventInput {
  id: string
  titre: string
  description: string | null
  dateDebut: Date
  dateFin?: Date | null
  lieu: string
  estGratuit: boolean
  statut: string
}

/** Statut événement interne → `eventStatus` Schema.org. */
const EVENT_STATUS: Record<string, string> = {
  a_venir: 'https://schema.org/EventScheduled',
  en_cours: 'https://schema.org/EventScheduled',
  termine: 'https://schema.org/EventScheduled',
  annule: 'https://schema.org/EventCancelled',
}

/** Event — injecté sur le détail d'un événement de l'agenda. */
export function eventJsonLd(e: EventInput): JsonLdObject {
  const base = appUrl()
  return prune({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.titre,
    description: plainDescription(e.description, 500),
    startDate: e.dateDebut.toISOString(),
    endDate: e.dateFin ? e.dateFin.toISOString() : undefined,
    eventStatus: EVENT_STATUS[e.statut] ?? 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.lieu,
      address: { '@type': 'PostalAddress', addressCountry: 'SN' },
    },
    isAccessibleForFree: e.estGratuit,
    organizer: { '@type': 'Organization', name: ORG_NAME, url: base },
    url: `${base}/agenda/${e.id}`,
  })
}
