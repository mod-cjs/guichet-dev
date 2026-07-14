// GUIC-565 — Adaptateur S3, utilisé en production contre le MinIO du serveur.
//
// MinIO expose une API S3 sur `127.0.0.1:9000` (boucle locale du serveur). Deux détails
// indispensables, et qui ne pardonnent pas :
//   - `forcePathStyle: true` — MinIO sert les buckets en chemin (`/guichet/clé`) et non en
//     sous-domaine (`guichet.host/clé`), qui exigerait un DNS générique ;
//   - la référence persistée est `s3://bucket/clé`, PAS une URL. Les CV sont des données
//     personnelles : c'est l'application qui les sert, après vérification de l'autorisation.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type {
  StockagePort,
  ObjetDepose,
  ContenuObjet,
  PageObjets,
  OptionsTeleversement,
  OptionsListage,
} from './port'

export interface ConfigS3 {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

/** `s3://bucket/clé` → `{ bucket, cle }`. */
export function decoderReference(reference: string): { bucket: string; cle: string } {
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(reference)
  if (!m) throw new Error(`Référence S3 invalide : « ${reference} »`)
  return { bucket: m[1], cle: m[2] }
}

/** Suffixe aléatoire : deux fichiers de même nom ne doivent jamais s'écraser. */
function cheminUnique(chemin: string): string {
  const suffixe = Math.random().toString(36).slice(2, 10)
  const point = chemin.lastIndexOf('.')
  return point === -1
    ? `${chemin}-${suffixe}`
    : `${chemin.slice(0, point)}-${suffixe}${chemin.slice(point)}`
}

export function creerStockageS3(config: ConfigS3): StockagePort {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    // Indispensable pour MinIO (buckets servis en chemin, pas en sous-domaine).
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return {
    async televerser(opts: OptionsTeleversement): Promise<ObjetDepose> {
      const cle = cheminUnique(opts.chemin)
      const corps = new Uint8Array(await opts.fichier.arrayBuffer())

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: cle,
          Body: corps,
          ContentType: opts.fichier.type || 'application/octet-stream',
          CacheControl: opts.cacheMaxAgeSec ? `max-age=${opts.cacheMaxAgeSec}` : undefined,
        }),
      )

      return { reference: `s3://${config.bucket}/${cle}`, chemin: cle }
    },

    async lire(reference: string): Promise<ContenuObjet> {
      const { bucket, cle } = decoderReference(reference)
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: cle }))
      if (!res.Body) throw new Error(`Objet vide ou introuvable : « ${reference} »`)

      return {
        corps: res.Body.transformToWebStream(),
        contentType: res.ContentType ?? 'application/octet-stream',
        taille: res.ContentLength,
      }
    },

    async lister(opts: OptionsListage): Promise<PageObjets> {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: opts.prefixe,
          ContinuationToken: opts.curseur,
        }),
      )

      return {
        objets: (res.Contents ?? []).map((o) => ({
          reference: `s3://${config.bucket}/${o.Key}`,
          chemin: o.Key ?? '',
          taille: o.Size ?? 0,
          deposeLe: o.LastModified ?? new Date(0),
        })),
        curseur: res.NextContinuationToken,
      }
    },

    async supprimer(reference: string): Promise<void> {
      const { bucket, cle } = decoderReference(reference)
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: cle }))
    },
  }
}
