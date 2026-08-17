/**
 * @jest-environment node
 *
 * ÉPIC GUIC-595 — validation END-TO-END de la chaîne de curation sur MariaDB réelle :
 * découverte (US-2) → extraction (US-3) → déduplication (US-4) → validation admin (US-5)
 * → publication (US-6) → monitoring (US-7). Seul le transport HTTP est injecté (fixtures).
 */
import { prisma } from '@/lib/prisma'
import { executerVeille } from '@/lib/curation/robot/run'
import { executerExtraction } from '@/lib/curation/extraction/run'
import { executerDedup } from '@/lib/curation/dedup/run'
import { statsParSource } from '@/lib/curation/monitoring/stats'
import type { ClientHttp } from '@/lib/curation/robot/http-client'

jest.setTimeout(45000)

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { approuverItem } from '@/app/admin/curation/actions'
import { publierItem } from '@/app/admin/curation/publier'

const ADMIN = { cjsUid: 'test-e2e-admin', roles: ['admin'] }
const PREFIX = 'test-e2e-curation'
const RUN = Date.now()

const noWait = async () => {}

async function purge() {
  const items = await prisma.itemCuration.findMany({ where: { source: { nom: { startsWith: PREFIX } } }, select: { opportuniteId: true } })
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.executionVeille.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  const oppIds = items.map((i) => i.opportuniteId).filter((x): x is string => !!x)
  if (oppIds.length) await prisma.opportunite.deleteMany({ where: { id: { in: oppIds } } })
  await prisma.opportunite.deleteMany({ where: { titre: { startsWith: PREFIX } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
  await prisma.auditLog.deleteMany({ where: { actorCjsUid: ADMIN.cjsUid } })
}
beforeAll(purge)
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('ÉPIC curation — pipeline end-to-end', () => {
  it('une source → découverte → extraction → dédup → validation → publication → monitoring', async () => {
    const typeEmploi = await prisma.opportuniteType.findUnique({ where: { slug: 'emploi' } })
    expect(typeEmploi).not.toBeNull()

    const sourceUrl = `https://source-${RUN}.sn/liste`
    const itemUrl = `https://source-${RUN}.sn/offre/1`
    const source = await prisma.sourceVeille.create({
      data: {
        nom: `${PREFIX} ANPEJ`,
        url: sourceUrl,
        methode: 'rss',
        frequence: 'quotidienne',
        typeDefautId: typeEmploi!.id, // → l'extraction posera typeId (requis pour publier)
        prochaineVerifLe: new Date(Date.now() - 1000), // due
      },
    })

    const PAGE_OFFRE = `<html><head><script type="application/ld+json">
      {"@type":"JobPosting","title":"${PREFIX} Développeur","description":"Poste à Dakar.",
       "hiringOrganization":{"name":"ONG Teranga"},"validThrough":"2026-12-31",
       "jobLocation":{"address":{"addressRegion":"Dakar"}},"industry":"Informatique"}
      </script></head></html>`

    // Client fixture : robots permissif + listing RSS de MA source uniquement ; page d'offre
    // pour l'item ; VIDE pour toute autre URL (n'interfère pas avec d'autres sources dues).
    const client: ClientHttp = async (url) => {
      if (url.endsWith('/robots.txt')) return { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
      if (url === sourceUrl) return { statut: 200, corps: `<rss><channel><item><link>${itemUrl}</link></item></channel></rss>`, contentType: 'application/rss+xml' }
      if (url === itemUrl) return { statut: 200, corps: PAGE_OFFRE, contentType: 'text/html' }
      return { statut: 200, corps: '<rss><channel></channel></rss>', contentType: 'application/rss+xml' }
    }

    // ── US-2 : DÉCOUVERTE ──────────────────────────────────────────────────
    await executerVeille({ client, attendre: noWait, sansVerrou: true })
    let item = await prisma.itemCuration.findFirst({ where: { sourceId: source.id } })
    expect(item?.statut).toBe('decouvert')
    expect(item?.urlCanonique).toBe(itemUrl)

    // ── US-3 : EXTRACTION ──────────────────────────────────────────────────
    await executerExtraction({ client, attendre: noWait, sourceIds: [source.id] })
    item = await prisma.itemCuration.findFirst({ where: { sourceId: source.id } })
    expect(item?.statut).toBe('a_valider')
    expect(item?.titre).toBe(`${PREFIX} Développeur`)
    const payload = item?.payloadExtrait as Record<string, unknown>
    expect(payload.organisation).toBe('ONG Teranga')
    expect(payload.region).toBe('Dakar') // mappé sur l'enum
    expect(payload.domaine).toBe('Economie') // Informatique → Numerique
    expect(payload.typeId).toBe(typeEmploi!.id) // du typeDefaut source

    // ── US-4 : DÉDUPLICATION (annonce unique → reste a_valider) ────────────
    await executerDedup({ sourceIds: [source.id] })
    item = await prisma.itemCuration.findFirst({ where: { sourceId: source.id } })
    expect(item?.statut).toBe('a_valider')
    expect(item?.empreinteContenu).toHaveLength(64)

    // ── US-5 : VALIDATION ADMIN (approuver) ────────────────────────────────
    mockGetSession.mockResolvedValue(ADMIN)
    await approuverItem(item!.id)
    item = await prisma.itemCuration.findUnique({ where: { id: item!.id } })
    expect(item?.statut).toBe('approuvee')

    // ── US-6 : PUBLICATION (→ Opportunite brouillon) ───────────────────────
    const { opportuniteId } = await publierItem(item!.id, ['yeah'])
    const opp = await prisma.opportunite.findUnique({ where: { id: opportuniteId }, include: { typeRef: true } })
    expect(opp?.statut).toBe('brouillon')
    expect(opp?.titre).toBe(`${PREFIX} Développeur`)
    expect(opp?.typeRef?.slug).toBe('emploi')
    expect(opp?.lienExterne).toBe(itemUrl) // traçabilité vers la source
    const apres = await prisma.itemCuration.findUnique({ where: { id: item!.id } })
    expect(apres?.opportuniteId).toBe(opportuniteId)

    // ── US-7 : MONITORING (la source apparaît avec 1 rapportée, 100% approbation) ──
    const st = (await statsParSource()).find((x) => x.sourceId === source.id)
    expect(st?.nbRapportees).toBe(1)
    expect(st?.tauxApprobation).toBe(100) // 1 approuvée / 1 décidée
    expect(st?.alerte).toBeNull()
    expect(st?.derniereVerif).toBeInstanceOf(Date) // posée par la découverte
  })
})
