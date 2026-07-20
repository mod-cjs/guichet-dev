/**
 * @jest-environment node
 *
 * GUIC-565 — Tolérance de nommage des variables S3.
 *
 * L'infra fournit les clés sous les noms `S3_ACCESS_KEY` / `S3_SECRET_KEY` (convention MinIO/mc),
 * alors que le code lisait `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` (convention AWS SDK). Un
 * `prod.env` rempli avec les noms de l'infra ferait lever « Stockage S3 incomplet » AU DÉMARRAGE.
 * On accepte donc les DEUX nommages — la variante AWS reste prioritaire.
 */
import { configS3Pour } from '@/lib/storage'

describe('GUIC-565 — noms de variables S3 (alias infra)', () => {
  const base = { S3_ENDPOINT: 'http://minio:9000', S3_BUCKET: 'guichet' }

  it('accepte la convention AWS (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)', () => {
    expect(
      configS3Pour({ ...base, S3_ACCESS_KEY_ID: 'AKI', S3_SECRET_ACCESS_KEY: 'SEC' }),
    ).toMatchObject({ accessKeyId: 'AKI', secretAccessKey: 'SEC', bucket: 'guichet' })
  })

  it('accepte la convention infra/MinIO (S3_ACCESS_KEY / S3_SECRET_KEY)', () => {
    expect(configS3Pour({ ...base, S3_ACCESS_KEY: 'AK', S3_SECRET_KEY: 'SK' })).toMatchObject({
      accessKeyId: 'AK',
      secretAccessKey: 'SK',
    })
  })

  it('la convention AWS est prioritaire si les deux sont fournies', () => {
    expect(
      configS3Pour({ ...base, S3_ACCESS_KEY_ID: 'AKI', S3_SECRET_ACCESS_KEY: 'SEC', S3_ACCESS_KEY: 'AK', S3_SECRET_KEY: 'SK' }),
    ).toMatchObject({ accessKeyId: 'AKI', secretAccessKey: 'SEC' })
  })

  it('région par défaut us-east-1, surchargeable', () => {
    expect(configS3Pour({ ...base, S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 'b' }).region).toBe('us-east-1')
    expect(configS3Pour({ ...base, S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 'b', S3_REGION: 'eu-west-1' }).region).toBe('eu-west-1')
  })

  it('lève un message actionnable si une clé manque, quel que soit le nommage', () => {
    expect(() => configS3Pour({ ...base })).toThrow(/S3_ACCESS_KEY/)
  })

  /**
   * GUIC-622 — sentinelle sur la FORME RÉELLE DE L'APPELANT.
   *
   * En production, l'unique appel est `configS3Pour(process.env)` : un environnement complet,
   * porteur de dizaines de variables étrangères à S3. Le paramètre avait été typé
   * `NodeJS.ProcessEnv`, ce qui exigeait `NODE_ENV` sur tout littéral de test (Next le déclare
   * obligatoire) → 6 erreurs tsc, `npm run validate` rouge sur dev, hook pre-push bloquant
   * toute branche, `--no-verify` routinier.
   *
   * Ce test fige les deux extrémités du contrat : la fonction accepte un environnement réel
   * (variables surnuméraires incluses) ET ne lit que ses clés `S3_*`.
   */
  it('accepte un environnement RÉEL (process.env) sans se laisser troubler par les variables étrangères', () => {
    const envReel = {
      ...process.env,
      ...base,
      S3_ACCESS_KEY: 'AK',
      S3_SECRET_KEY: 'SK',
    }
    expect(configS3Pour(envReel)).toMatchObject({
      accessKeyId:     'AK',
      secretAccessKey: 'SK',
      bucket:          'guichet',
      endpoint:        'http://minio:9000',
    })
  })
})
