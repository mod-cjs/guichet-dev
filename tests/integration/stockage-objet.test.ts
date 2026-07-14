/**
 * @jest-environment node
 *
 * GUIC-565 — Stockage objet : remplacer Vercel Blob par S3/MinIO.
 *
 * Aujourd'hui, CV, photos et justificatifs passent par `@vercel/blob`. Sur OVH, Vercel Blob
 * N'EXISTE PAS → l'upload est purement et simplement cassé en production. Le serveur fournit
 * un MinIO (bucket `guichet`, 20 Gio, utilisateur applicatif dédié).
 *
 * Deux exigences, et la seconde est celle qu'on oublie :
 *   1. l'adaptateur S3 sait téléverser, lire, lister et supprimer ;
 *   2. les fichiers DÉJÀ en base pointent sur des URL Vercel (`https://…vercel-storage.com/…`).
 *      Basculer le pilote ne doit PAS les rendre illisibles — la résolution se fait donc sur la
 *      FORME de la référence, pas sur le pilote actif.
 *
 * Testé contre un VRAI MinIO (pas un mock) : c'est le seul moyen de vérifier qu'on parle bien
 * le S3 que MinIO attend.
 */
import { S3Client, CreateBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { creerStockageS3 } from '@/lib/storage/s3-adapter'
import { estReferenceVercel } from '@/lib/storage'

const ENDPOINT = process.env.S3_TEST_ENDPOINT ?? 'http://127.0.0.1:9100'
const BUCKET = 'guichet'
const CONFIG = {
  endpoint: ENDPOINT,
  region: 'us-east-1',
  bucket: BUCKET,
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin123',
}

const stockage = creerStockageS3(CONFIG)

function fichier(nom: string, contenu: string, type = 'application/pdf'): File {
  return new File([contenu], nom, { type })
}

beforeAll(async () => {
  // Idempotent : le bucket existe déjà en local, mais la CI part d'un MinIO vierge.
  const client = new S3Client({
    endpoint: ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: CONFIG.accessKeyId, secretAccessKey: CONFIG.secretAccessKey },
  })
  await client.send(new CreateBucketCommand({ Bucket: BUCKET })).catch(() => {
    /* déjà créé */
  })
  client.destroy()
})

describe('GUIC-565 — adaptateur S3/MinIO (vrai serveur)', () => {
  it('téléverse un fichier et renvoie une référence stockable en base', async () => {
    const ref = await stockage.televerser({
      chemin: 'profil-cv/uid-test/cv.pdf',
      fichier: fichier('cv.pdf', 'contenu du CV'),
    })

    // La référence n'est PAS une URL publique : les CV sont des données personnelles, ils
    // restent servis par l'application, qui vérifie l'autorisation (CDP).
    expect(ref.reference).toMatch(/^s3:\/\//)
    expect(ref.chemin).toContain('profil-cv/uid-test/')
  })

  it('relit le contenu téléversé', async () => {
    const { reference } = await stockage.televerser({
      chemin: 'profil-cv/uid-lecture/cv.pdf',
      fichier: fichier('cv.pdf', 'contenu relu'),
    })

    const flux = await stockage.lire(reference)
    expect(flux.contentType).toBe('application/pdf')
    const texte = await new Response(flux.corps).text()
    expect(texte).toBe('contenu relu')
  })

  it('évite l’écrasement : deux fichiers de même nom cohabitent', async () => {
    const a = await stockage.televerser({ chemin: 'profil-cv/uid-collision/cv.pdf', fichier: fichier('cv.pdf', 'A') })
    const b = await stockage.televerser({ chemin: 'profil-cv/uid-collision/cv.pdf', fichier: fichier('cv.pdf', 'B') })

    expect(a.reference).not.toBe(b.reference)
    expect(await new Response((await stockage.lire(a.reference)).corps).text()).toBe('A')
    expect(await new Response((await stockage.lire(b.reference)).corps).text()).toBe('B')
  })

  it('liste par préfixe, avec pagination (le nettoyage des CV orphelins en dépend)', async () => {
    for (let i = 0; i < 3; i++) {
      await stockage.televerser({ chemin: `listing-test/f${i}.pdf`, fichier: fichier(`f${i}.pdf`, `x${i}`) })
    }
    const page = await stockage.lister({ prefixe: 'listing-test/' })
    expect(page.objets.length).toBeGreaterThanOrEqual(3)
    expect(page.objets[0]).toHaveProperty('deposeLe')
    expect(page.objets[0].deposeLe).toBeInstanceOf(Date)
  })

  it('supprime un objet (purge CDP des CV orphelins)', async () => {
    const { reference } = await stockage.televerser({
      chemin: 'purge-test/cv.pdf',
      fichier: fichier('cv.pdf', 'a supprimer'),
    })
    await stockage.supprimer(reference)
    await expect(stockage.lire(reference)).rejects.toThrow()
  })
})

describe('GUIC-565 — compatibilité avec les fichiers déjà en base', () => {
  it('reconnaît une URL Vercel héritée', () => {
    expect(estReferenceVercel('https://abc123.public.blob.vercel-storage.com/profil-cv/x.pdf')).toBe(true)
  })

  it('ne confond pas une référence S3 avec une URL Vercel', () => {
    expect(estReferenceVercel('s3://guichet/profil-cv/x.pdf')).toBe(false)
  })
})
