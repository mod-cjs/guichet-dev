/**
 * @jest-environment node
 *
 * GUIC-704 · fix #4 — la découverte transmet l'Accept configuré par la source au fetch du
 * LISTING (négociation de contenu légitime → débloque les sources qui refusent notre Accept
 * par défaut, ex. reliefweb 406). Le robots.txt reste au défaut.
 */
import { decouvrirSource } from '@/lib/curation/robot/discover'
import type { ReponseHttp } from '@/lib/curation/robot/http-client'
import type { SourceVeille } from '@prisma/client'

function source(over: Partial<SourceVeille>): SourceVeille {
  return {
    id: 's1',
    nom: 'src',
    url: 'https://ex.sn/feed',
    methode: 'auto',
    frequence: 'quotidienne',
    actif: true,
    configExtraction: null,
    typeDefautId: null,
    prochaineVerifLe: null,
    derniereVerifLe: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...over,
  } as SourceVeille
}

describe('GUIC-704 — decouvrirSource : Accept par source', () => {
  it('transmet configExtraction.accept au listing, laisse robots.txt au défaut', async () => {
    const vus: { url: string; accept?: string }[] = []
    const client = async (url: string, opts?: { accept?: string }): Promise<ReponseHttp> => {
      vus.push({ url, accept: opts?.accept })
      if (url.endsWith('/robots.txt')) return { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
      return { statut: 200, corps: '<rss><channel><item><link>https://ex.sn/1</link></item></channel></rss>', contentType: 'application/rss+xml' }
    }

    const src = source({ url: 'https://ex.sn/feed', configExtraction: { accept: 'application/rss+xml' } as never })
    const r = await decouvrirSource(src, client)
    expect(r.liens).toContain('https://ex.sn/1')

    const listing = vus.find((v) => v.url === 'https://ex.sn/feed')
    expect(listing?.accept).toBe('application/rss+xml')
    const robots = vus.find((v) => v.url.endsWith('/robots.txt'))
    expect(robots?.accept).toBeUndefined()
  })

  it('GUIC-704 SPA — transmet configExtraction.rendreJs au fetch du listing (robots reste sans rendu)', async () => {
    const vus: { url: string; rendreJs?: boolean }[] = []
    const client = async (url: string, opts?: { accept?: string; rendreJs?: boolean }) => {
      vus.push({ url, rendreJs: opts?.rendreJs })
      if (url.endsWith('/robots.txt')) return { statut: 200, corps: 'User-agent: *\nDisallow:\n', contentType: 'text/plain' }
      return { statut: 200, corps: '<rss><channel><item><link>https://ex.sn/1</link></item></channel></rss>', contentType: 'application/rss+xml' }
    }
    const src = source({ url: 'https://ex.sn/feed', methode: 'html_selecteurs', configExtraction: { rendreJs: true } as never })
    await decouvrirSource(src, client)

    expect(vus.find((v) => v.url === 'https://ex.sn/feed')?.rendreJs).toBe(true)
    expect(vus.find((v) => v.url.endsWith('/robots.txt'))?.rendreJs).toBeFalsy()
  })
})
