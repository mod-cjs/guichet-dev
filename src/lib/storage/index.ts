// GUIC-565 — Point d'entrée unique du stockage objet.
//
// Deux règles, et il faut bien distinguer les deux :
//
//   ÉCRIRE  → on utilise le pilote ACTIF (`STORAGE_DRIVER`). En production OVH : S3/MinIO.
//   LIRE / SUPPRIMER → on résout sur la FORME DE LA RÉFÉRENCE, jamais sur le pilote actif.
//
// La seconde règle est ce qui empêche de casser l'existant : des CV, photos et diplômes sont
// déjà stockés sur Vercel Blob, et leurs URL sont en base. Le jour où l'on bascule sur MinIO,
// ces fichiers doivent rester lisibles — sinon on rend inaccessibles les pièces jointes de
// milliers de jeunes. Une référence `https://…` est donc toujours lue par Vercel, même quand
// le pilote actif est S3.

import type { StockagePort } from './port'
import type { ConfigS3 } from './s3-adapter'

export type { StockagePort, ObjetDepose, ObjetListe, PageObjets, ContenuObjet } from './port'

/** Une référence héritée de Vercel Blob est une URL ; une référence S3 commence par `s3://`. */
export function estReferenceVercel(reference: string): boolean {
  return /^https?:\/\//i.test(reference)
}

function configS3(): ConfigS3 {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Stockage S3 incomplet : renseigner S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID et ' +
        'S3_SECRET_ACCESS_KEY (identifiants MinIO du serveur).',
    )
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, region: process.env.S3_REGION ?? 'us-east-1' }
}

/** Pilote actif : `s3` dès que l'endpoint est configuré, `vercel` sinon (miroir de dev). */
export function piloteActif(): 's3' | 'vercel' {
  const choix = process.env.STORAGE_DRIVER?.trim().toLowerCase()
  if (choix === 's3' || choix === 'minio') return 's3'
  if (choix === 'vercel') return 'vercel'
  return process.env.S3_ENDPOINT ? 's3' : 'vercel'
}

let _s3: StockagePort | undefined
let _vercel: StockagePort | undefined

// Les adaptateurs sont chargés À LA DEMANDE : chacun tire un SDK lourd (AWS S3 d'un côté,
// Vercel Blob de l'autre). Un import statique les chargerait TOUS LES DEUX partout —
// jusque dans les tests de composants, où le SDK AWS (ESM) fait exploser le transformeur
// Jest. On ne paie donc que le fournisseur réellement utilisé.

function stockageS3(): StockagePort {
  if (!_s3) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { creerStockageS3 } = require('./s3-adapter') as typeof import('./s3-adapter')
    _s3 = creerStockageS3(configS3())
  }
  return _s3
}

function stockageVercel(): StockagePort {
  if (!_vercel) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { creerStockageVercel } = require('./vercel-adapter') as typeof import('./vercel-adapter')
    _vercel = creerStockageVercel()
  }
  return _vercel
}

/** Stockage à utiliser pour ÉCRIRE (pilote actif). */
export function stockage(): StockagePort {
  return piloteActif() === 's3' ? stockageS3() : stockageVercel()
}

/**
 * Stockage à utiliser pour LIRE ou SUPPRIMER une référence donnée.
 * Résolu sur la forme de la référence → les fichiers hérités de Vercel restent lisibles
 * après la bascule sur MinIO.
 */
export function stockagePour(reference: string): StockagePort {
  return estReferenceVercel(reference) ? stockageVercel() : stockageS3()
}

/** Réinitialise les singletons (tests). */
export function __resetStockage(): void {
  _s3 = undefined
  _vercel = undefined
}
