// GUIC-565 — Adaptateur Vercel Blob.
//
// Conservé pour DEUX raisons, et la seconde est la plus importante :
//   1. le miroir de développement est déployé sur Vercel, et il ne peut pas joindre le MinIO
//      du serveur (celui-ci écoute sur la boucle locale d'OVH) ;
//   2. des fichiers sont DÉJÀ stockés sur Vercel Blob, et leurs URL sont en base. Basculer le
//      pilote ne doit pas les rendre illisibles — cet adaptateur reste donc le lecteur des
//      références héritées, quel que soit le pilote actif.

import { put, del, list } from '@vercel/blob'
import type {
  StockagePort,
  ObjetDepose,
  ContenuObjet,
  PageObjets,
  OptionsTeleversement,
  OptionsListage,
} from './port'

export function creerStockageVercel(): StockagePort {
  const token = () => process.env.BLOB_READ_WRITE_TOKEN

  return {
    async televerser(opts: OptionsTeleversement): Promise<ObjetDepose> {
      const blob = await put(opts.chemin, opts.fichier, {
        // Défaut PRIVÉ : c'est l'application qui sert le contenu après contrôle d'autorisation.
        // Les appels historiques qui demandent explicitement `public` gardent leur comportement.
        access: opts.acces === 'public' ? 'public' : 'private',
        addRandomSuffix: true,
        contentType: opts.fichier.type,
        cacheControlMaxAge: opts.cacheMaxAgeSec,
      } as Parameters<typeof put>[2])
      return { reference: blob.url, chemin: blob.pathname }
    },

    async lire(reference: string): Promise<ContenuObjet> {
      // Le blob est privé : le token est injecté côté serveur, jamais exposé au client.
      const amont = await fetch(reference, {
        headers: token() ? { Authorization: `Bearer ${token()}` } : undefined,
      })
      if (!amont.ok || !amont.body) {
        throw new Error(`Lecture Vercel Blob échouée (${amont.status}) : ${reference}`)
      }
      return {
        corps: amont.body,
        contentType: amont.headers.get('content-type') ?? 'application/octet-stream',
      }
    },

    async lister(opts: OptionsListage): Promise<PageObjets> {
      const page = await list({ prefix: opts.prefixe, cursor: opts.curseur, token: token() })
      return {
        objets: page.blobs.map((b) => ({
          reference: b.url,
          chemin: b.pathname,
          taille: b.size,
          deposeLe: b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt),
        })),
        curseur: page.hasMore ? page.cursor : undefined,
      }
    },

    async supprimer(reference: string): Promise<void> {
      await del(reference, { token: token() })
    },
  }
}
