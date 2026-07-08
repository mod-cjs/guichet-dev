import {
  prune,
  organizationJsonLd,
  webSiteJsonLd,
  jobPostingJsonLd,
  eventJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo/json-ld'

// appUrl() lit NEXT_PUBLIC_APP_URL ; forcé ici pour des URLs déterministes.
const OLD_ENV = process.env.NEXT_PUBLIC_APP_URL
beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://guichetjeunesse.sn'
})
afterAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = OLD_ENV
})

describe('prune', () => {
  it('retire les clés undefined/null et les chaînes vides', () => {
    expect(prune({ a: 1, b: undefined, c: null, d: '' })).toEqual({ a: 1 })
  })
  it('nettoie récursivement objets et tableaux', () => {
    expect(prune({ nested: { x: undefined, y: 2 }, list: [1, undefined, 3] })).toEqual({
      nested: { y: 2 },
      list: [1, 3],
    })
  })
  it('conserve false et 0', () => {
    expect(prune({ free: false, count: 0 })).toEqual({ free: false, count: 0 })
  })
})

describe('organizationJsonLd', () => {
  const org = organizationJsonLd()
  it('déclare le bon type et contexte', () => {
    expect(org['@context']).toBe('https://schema.org')
    expect(org['@type']).toBe('Organization')
  })
  it('utilise une URL absolue pour le logo', () => {
    expect(org.logo).toBe('https://guichetjeunesse.sn/logo-guichet.png')
    expect(org.url).toBe('https://guichetjeunesse.sn')
  })
})

describe('breadcrumbJsonLd', () => {
  const items = [
    { name: 'Accueil', path: '/' },
    { name: 'Opportunités', path: '/opportunites' },
    { name: 'Développeur web', path: '/opportunites/dev-web' },
  ]

  it('déclare un BreadcrumbList avec positions 1-indexées', () => {
    const bc = breadcrumbJsonLd(items)
    expect(bc['@type']).toBe('BreadcrumbList')
    const el = bc.itemListElement as Array<Record<string, unknown>>
    expect(el).toHaveLength(3)
    expect(el.map((e) => e.position)).toEqual([1, 2, 3])
  })

  it('construit des URLs absolues pour chaque niveau', () => {
    const el = breadcrumbJsonLd(items).itemListElement as Array<Record<string, unknown>>
    expect(el[0].item).toBe('https://guichetjeunesse.sn/')
    expect(el[2].item).toBe('https://guichetjeunesse.sn/opportunites/dev-web')
    expect(el[1].name).toBe('Opportunités')
  })
})

describe('webSiteJsonLd', () => {
  it('expose une SearchAction avec urlTemplate absolu', () => {
    const site = webSiteJsonLd()
    expect(site['@type']).toBe('WebSite')
    const action = site.potentialAction as Record<string, unknown>
    const target = action.target as Record<string, unknown>
    expect(String(target.urlTemplate)).toContain('https://guichetjeunesse.sn/opportunites?q=')
  })
})

describe('jobPostingJsonLd', () => {
  const base = {
    slug: 'dev-web-dakar',
    titre: 'Développeur web',
    description: '<p>Rejoignez <strong>notre</strong> équipe</p>',
    type: 'Emploi',
    organisation: 'CJS',
    createdAt: new Date('2026-01-10T09:00:00.000Z'),
  }

  it('mappe le type vers employmentType et sérialise les dates en ISO', () => {
    const jp = jobPostingJsonLd({ ...base, deadline: new Date('2026-02-01T00:00:00.000Z') })
    expect(jp['@type']).toBe('JobPosting')
    expect(jp.employmentType).toBe('FULL_TIME')
    expect(jp.datePosted).toBe('2026-01-10T09:00:00.000Z')
    expect(jp.validThrough).toBe('2026-02-01T00:00:00.000Z')
  })

  it('nettoie la description HTML en texte brut', () => {
    const jp = jobPostingJsonLd(base)
    expect(jp.description).toBe('Rejoignez notre équipe')
  })

  it('omet validThrough absent (pas de undefined dans le payload)', () => {
    const jp = jobPostingJsonLd(base)
    expect('validThrough' in jp).toBe(false)
    expect(JSON.stringify(jp)).not.toContain('undefined')
  })

  it('émet toujours jobLocation avec au minimum le pays (requis Google)', () => {
    const jp = jobPostingJsonLd(base)
    const loc = jp.jobLocation as Record<string, Record<string, string>>
    expect(loc['@type']).toBe('Place')
    expect(loc.address.addressCountry).toBe('SN')
    // Sans région : pas de locality/region (prunés), mais jobLocation présent.
    expect('addressRegion' in loc.address).toBe(false)
  })

  it('construit jobLocation avec la région lisible (locality + region)', () => {
    const jp = jobPostingJsonLd({ ...base, region: 'Saint_Louis' })
    const loc = jp.jobLocation as Record<string, Record<string, string>>
    expect(loc.address.addressLocality).toBe('Saint Louis')
    expect(loc.address.addressRegion).toBe('Saint Louis')
    expect(loc.address.addressCountry).toBe('SN')
  })

  it('retombe sur OTHER pour un type inconnu', () => {
    expect(jobPostingJsonLd({ ...base, type: 'Inconnu' }).employmentType).toBe('OTHER')
  })

  it('structure baseSalary (montant unique, devise XOF) depuis la rémunération', () => {
    const jp = jobPostingJsonLd({ ...base, remuneration: '300 000 FCFA / mois' })
    const salary = jp.baseSalary as Record<string, Record<string, unknown>>
    expect(salary['@type']).toBe('MonetaryAmount')
    expect(salary.currency).toBe('XOF')
    expect(salary.value.value).toBe(300000)
    expect(salary.value.unitText).toBe('MONTH')
  })

  it('structure baseSalary en fourchette (min/max) et déduit la période annuelle', () => {
    const jp = jobPostingJsonLd({ ...base, remuneration: 'Entre 2 000 000 et 3 500 000 FCFA par an' })
    const value = (jp.baseSalary as Record<string, Record<string, unknown>>).value
    expect(value.minValue).toBe(2000000)
    expect(value.maxValue).toBe(3500000)
    expect(value.unitText).toBe('YEAR')
  })

  it('omet baseSalary quand la rémunération n’est pas chiffrée', () => {
    const jp = jobPostingJsonLd({ ...base, remuneration: 'Selon profil' })
    expect('baseSalary' in jp).toBe(false)
  })
})

describe('eventJsonLd', () => {
  const base = {
    id: 'evt-1',
    titre: 'Forum emploi',
    description: 'Rencontres',
    dateDebut: new Date('2026-03-01T10:00:00.000Z'),
    lieu: 'Centre CJS Dakar',
    estGratuit: true,
    statut: 'a_venir',
  }

  it('sérialise les dates et mappe le statut', () => {
    const ev = eventJsonLd({ ...base, dateFin: new Date('2026-03-01T16:00:00.000Z') })
    expect(ev['@type']).toBe('Event')
    expect(ev.startDate).toBe('2026-03-01T10:00:00.000Z')
    expect(ev.endDate).toBe('2026-03-01T16:00:00.000Z')
    expect(ev.eventStatus).toBe('https://schema.org/EventScheduled')
  })

  it('conserve isAccessibleForFree=false (non pruné)', () => {
    const ev = eventJsonLd({ ...base, estGratuit: false })
    expect(ev.isAccessibleForFree).toBe(false)
  })

  it('mappe annule vers EventCancelled et omet endDate absent', () => {
    const ev = eventJsonLd({ ...base, statut: 'annule' })
    expect(ev.eventStatus).toBe('https://schema.org/EventCancelled')
    expect('endDate' in ev).toBe(false)
  })
})
