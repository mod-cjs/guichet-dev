/**
 * @jest-environment node
 *
 * GUIC-689 — INTÉGRATION RÉELLE : `listOpportunites` (prisma + Redis NON mockés,
 * MariaDB docker gj-maria port 3307) contre une vraie table `opportunites`.
 *
 * Isolation : région `Sedhiou` + slugs préfixés `test-guic689-filtres`. Chaque
 * assertion ne porte QUE sur les slugs des fixtures de ce fichier.
 *
 * GUIC-642 — l'isolation reposait auparavant sur « 0 opportunité publiée
 * pré-existante en Sedhiou, vérifié en base au moment d'écrire ce test ». C'est
 * un instantané d'un jeu de données, pas une contrainte : sur une base réaliste
 * (87 opportunités publiées en Sedhiou), le test virait au rouge sans qu'aucun
 * code de production n'ait changé. Ne jamais réintroduire d'assertion sur un
 * total global — la région est un filtre, pas un espace réservé à ce test.
 *
 * Preuve du bug (avant fix) : `remuneration` et `deadline` n'étaient ni lus par la
 * route ni transformés en clause SQL par le loader — basculer ces filtres ne
 * changeait jamais la liste retournée.
 */
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { listOpportunites } from '@/lib/opportunites-loader'
import type { OpportuniteFiltres } from '@/types/opportunite'

jest.setTimeout(30000)

const PREFIX = 'test-guic689-filtres'
const RUN = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
const REGION_ISOLATION = 'Sedhiou' as const

const base: OpportuniteFiltres = { page: 1, sortBy: 'recent', region: REGION_ISOLATION }

function slug(suffix: string): string {
  return `${PREFIX}-${suffix}-${RUN}`
}

async function fixture(suffix: string, remuneration: string | null, deadline: Date | null) {
  return prisma.opportunite.create({
    data: {
      slug: slug(suffix),
      titre: `${PREFIX} ${suffix}`,
      description: 'Fixture GUIC-689 — filtres rémunération/deadline (intégration réelle).',
      type: 'Volontariat',
      organisation: 'CJS Test GUIC-689',
      domaine: 'Culture',
      region: REGION_ISOLATION,
      statut: 'publiee',
      remuneration,
      deadline,
    },
  })
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000)
}

async function purge() {
  await prisma.opportunite.deleteMany({ where: { slug: { startsWith: PREFIX } } })
}

/**
 * Purge le cache Redis de LA LISTE (préfixe applicatif `opp:list*` uniquement —
 * pas de `flushdb`, pour ne pas perturber d'autres tests d'intégration tournant
 * en parallèle sur le même Redis). Sans ça, une exécution répétée de ce fichier
 * (ou un run précédent dans la fenêtre de TTL de 5 min) pourrait servir un
 * résultat mis en cache par un état DB antérieur — faux négatif ou faux positif
 * indépendant du code testé.
 *
 * Piège ioredis `keyPrefix` (GUIC-566, `redis.ts`) : `KEYS` n'auto-préfixe PAS
 * son motif (il faut l'inclure à la main dans le pattern), mais `DEL` préfixe
 * bien chacune de ses clés — il faut donc retirer le préfixe des clés obtenues
 * par `KEYS` avant de les passer à `DEL`, sous peine de double-préfixage muet.
 */
async function purgeCache() {
  const prefix = (redis.options.keyPrefix ?? '') as string
  const keys = await redis.keys(`${prefix}opp:list*`)
  if (keys.length === 0) return
  const bare = keys.map((k) => (prefix && k.startsWith(prefix) ? k.slice(prefix.length) : k))
  await redis.del(...bare)
}

beforeAll(async () => {
  await purge()
  await purgeCache()
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-689 — filtre rémunération (règle métier, DB réelle)', () => {
  let negociable: { slug: string }
  let indemniteTransport: { slug: string }
  let boursePartielle: { slug: string }
  let nonRemunere: { slug: string }
  let vide: { slug: string }
  let nul: { slug: string }
  let benevole: { slug: string }

  beforeAll(async () => {
    negociable = await fixture('salaire-negociable', 'Salaire négociable', null)
    indemniteTransport = await fixture('indemnite-transport', 'Indemnité de transport', null)
    boursePartielle = await fixture('bourse-partielle', 'Bourse partielle', null)
    nonRemunere = await fixture('non-remunere', 'Non rémunéré', null)
    vide = await fixture('vide', '', null)
    nul = await fixture('null', null, null)
    benevole = await fixture('benevole', 'Bénévole', null)
  })

  it('remuneration=yes : « Salaire négociable », « Indemnité de transport », « Bourse partielle » comptent comme rémunérées', async () => {
    const res = await listOpportunites({ ...base, remuneration: 'yes' })
    const slugs = res.items.map((i) => i.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([negociable.slug, indemniteTransport.slug, boursePartielle.slug]),
    )
    expect(slugs).not.toContain(nonRemunere.slug)
    expect(slugs).not.toContain(vide.slug)
    expect(slugs).not.toContain(nul.slug)
    expect(slugs).not.toContain(benevole.slug)
  })

  it('remuneration=no : « Non rémunéré », vide, NULL et « Bénévole » comptent comme non rémunérées', async () => {
    const res = await listOpportunites({ ...base, remuneration: 'no' })
    const slugs = res.items.map((i) => i.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([nonRemunere.slug, vide.slug, nul.slug, benevole.slug]),
    )
    expect(slugs).not.toContain(negociable.slug)
    expect(slugs).not.toContain(indemniteTransport.slug)
    expect(slugs).not.toContain(boursePartielle.slug)
  })

  it('sans filtre remuneration : les 7 fixtures ressortent toutes', async () => {
    // `domaine` explicite (vrai pour toutes nos fixtures, ne restreint rien) —
    // seulement pour obtenir une clé de cache Redis distincte du bloc deadline
    // ci-dessous, qui interroge la MÊME région à un instant différent de l'état DB.
    const res = await listOpportunites({ ...base, domaine: 'Culture' })
    const slugs = res.items.map((i) => i.slug)
    // GUIC-642 — on assertait `res.total === 7`, ce qui comptait aussi les
    // opportunités réelles de la région. Ce qui est testé ici, c'est qu'aucune
    // fixture n'est écartée en l'absence de filtre : on l'exprime directement.
    // `sortBy: 'recent'` garantit que les fixtures, créées à l'instant, sont en
    // tête de la première page.
    expect(slugs).toEqual(
      expect.arrayContaining([
        negociable.slug,
        indemniteTransport.slug,
        boursePartielle.slug,
        nonRemunere.slug,
        vide.slug,
        nul.slug,
        benevole.slug,
      ]),
    )
  })
})

describe('GUIC-689 — filtre deadline J-7 / J-30 (DB réelle)', () => {
  let dans3Jours: { slug: string }
  let dans20Jours: { slug: string }
  let dans60Jours: { slug: string }
  let sansLimite: { slug: string }

  beforeAll(async () => {
    dans3Jours = await fixture('dans-3j', null, daysFromNow(3))
    dans20Jours = await fixture('dans-20j', null, daysFromNow(20))
    dans60Jours = await fixture('dans-60j', null, daysFromNow(60))
    sansLimite = await fixture('sans-limite', null, null)
  })

  it('deadline=7 : ne garde que ce qui expire dans les 7 jours', async () => {
    const res = await listOpportunites({ ...base, deadline: '7' })
    const slugs = res.items.map((i) => i.slug)
    expect(slugs).toContain(dans3Jours.slug)
    expect(slugs).not.toContain(dans20Jours.slug)
    expect(slugs).not.toContain(dans60Jours.slug)
    expect(slugs).not.toContain(sansLimite.slug)
  })

  it('deadline=30 : garde J-3 et J-20, exclut J-60 et "sans limite"', async () => {
    const res = await listOpportunites({ ...base, deadline: '30' })
    const slugs = res.items.map((i) => i.slug)
    expect(slugs).toEqual(expect.arrayContaining([dans3Jours.slug, dans20Jours.slug]))
    expect(slugs).not.toContain(dans60Jours.slug)
    expect(slugs).not.toContain(sansLimite.slug)
  })

  it('sans filtre deadline : les 4 fixtures de ce bloc ressortent (aucune expirée)', async () => {
    // `type` explicite (vrai pour toutes nos fixtures) uniquement pour obtenir une
    // clé de cache Redis distincte du "sans filtre remuneration" ci-dessus : même
    // région, mêmes filtres bruts, mais état DB différent (4 fixtures de plus créées
    // entre-temps) — sans ça, le cache Redis servirait le résultat figé du 1er appel.
    const res = await listOpportunites({ ...base, type: 'Volontariat' })
    const slugs = res.items.map((i) => i.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([
        dans3Jours.slug,
        dans20Jours.slug,
        dans60Jours.slug,
        sansLimite.slug,
      ]),
    )
  })
})
