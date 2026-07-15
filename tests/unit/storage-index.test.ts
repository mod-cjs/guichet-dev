/**
 * @jest-environment node
 *
 * GUIC-565 — Logique de décision du stockage objet (cœur de la prévention F1).
 *
 * `estReferenceVercel` et `stockagePour` décident, sur la FORME de la référence, quel fournisseur
 * lit un fichier. C'est CE qui empêche une référence `s3://` de fuir vers le navigateur (et
 * inversement une URL Vercel héritée d'être cassée après la bascule MinIO). On la teste en
 * isolation, avec les cas limites, parce qu'une régression ici rouvre F1 sans bruit.
 */
import { estReferenceVercel, piloteActif } from '@/lib/storage'
import { decoderReference } from '@/lib/storage/s3-adapter'

describe('GUIC-565 — estReferenceVercel (routage de lecture)', () => {
  it('reconnaît une URL Vercel héritée (https/http)', () => {
    expect(estReferenceVercel('https://abc.public.blob.vercel-storage.com/profil-cv/x.pdf')).toBe(true)
    expect(estReferenceVercel('http://localhost/x')).toBe(true)
    expect(estReferenceVercel('HTTPS://ABC.vercel-storage.com/x')).toBe(true) // insensible à la casse
  })

  it('ne prend PAS une référence S3 pour une URL Vercel', () => {
    expect(estReferenceVercel('s3://guichet/profil-cv/x.pdf')).toBe(false)
    expect(estReferenceVercel('s3://bucket/a/b/c.pdf')).toBe(false)
  })

  it('traite une référence vide ou malformée comme non-Vercel (défaut sûr : S3)', () => {
    expect(estReferenceVercel('')).toBe(false)
    expect(estReferenceVercel('profil-cv/x.pdf')).toBe(false)
    expect(estReferenceVercel('ftp://x/y')).toBe(false)
  })
})

describe('GUIC-565 — piloteActif (choix du pilote d’écriture)', () => {
  const OLD = { ...process.env }
  afterEach(() => {
    process.env = { ...OLD }
  })

  it('force S3 quand STORAGE_DRIVER=s3 ou minio', () => {
    process.env.STORAGE_DRIVER = 's3'
    expect(piloteActif()).toBe('s3')
    process.env.STORAGE_DRIVER = 'minio'
    expect(piloteActif()).toBe('s3')
  })

  it('force Vercel quand STORAGE_DRIVER=vercel', () => {
    process.env.STORAGE_DRIVER = 'vercel'
    delete process.env.S3_ENDPOINT
    expect(piloteActif()).toBe('vercel')
  })

  it('choisit S3 automatiquement dès que S3_ENDPOINT est renseigné', () => {
    delete process.env.STORAGE_DRIVER
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000'
    expect(piloteActif()).toBe('s3')
  })

  it('retombe sur Vercel (miroir de dev) sans configuration S3', () => {
    delete process.env.STORAGE_DRIVER
    delete process.env.S3_ENDPOINT
    expect(piloteActif()).toBe('vercel')
  })
})

describe('GUIC-565 — decoderReference (parsing s3://)', () => {
  it('décode bucket + clé', () => {
    expect(decoderReference('s3://guichet/profil-cv/uid/cv-a1b2.pdf')).toEqual({
      bucket: 'guichet',
      cle: 'profil-cv/uid/cv-a1b2.pdf',
    })
  })

  it('gère une clé avec plusieurs segments', () => {
    expect(decoderReference('s3://b/a/b/c/d.pdf')).toEqual({ bucket: 'b', cle: 'a/b/c/d.pdf' })
  })

  it('lève sur une référence invalide (ni bucket ni clé)', () => {
    expect(() => decoderReference('https://x/y')).toThrow()
    expect(() => decoderReference('s3://sans-cle')).toThrow()
    expect(() => decoderReference('')).toThrow()
  })
})
