/**
 * @jest-environment node
 *
 * GUIC-700 — `reconcile.ts` et `purge-absents.ts` sondent l'entrepôt via un conteneur
 * `postgres:16-alpine --rm` jetable, chacun avec sa propre copie de l'invocation
 * `execFileSync('docker', ['run', ...])`. Trouvé au premier run réel en préprod : ni l'un
 * ni l'autre ne passait `--network` — exactement le même piège déjà corrigé pour `meltano`
 * (`cjs_analytics_postgres` est un nom de conteneur sur `cjs-net`, pas un domaine
 * résoluble sur le réseau par défaut d'un `docker run` isolé).
 *
 * `psqlEntrepot` centralise l'invocation dans un seul module testable — sans dupliquer le
 * correctif dans les deux scripts.
 */
import { execFileSync } from 'node:child_process'

jest.mock('node:child_process')
const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>

import { psqlEntrepot } from '@/../scripts/datahub/psql-entrepot'

describe('GUIC-700 — psqlEntrepot : joint cjs-net pour résoudre cjs_analytics_postgres', () => {
  beforeEach(() => {
    execFileSyncMock.mockReset()
    execFileSyncMock.mockReturnValue('42')
    process.env.WAREHOUSE_DATABASE_URL = 'postgresql://user:pass@cjs_analytics_postgres:5432/entrepot'
  })

  it('passe --network avec le réseau cjs-net par défaut', () => {
    psqlEntrepot('SELECT COUNT(*) FROM guichet_raw.utilisateurs')
    const [, args] = execFileSyncMock.mock.calls[0]
    expect(args).toContain('--network')
    expect(args?.[args.indexOf('--network') + 1]).toBe('cjs-net')
  })

  it('respecte SERVICES_NETWORK si défini, comme docker-compose.prod.yml', () => {
    process.env.SERVICES_NETWORK = 'reseau-perso'
    psqlEntrepot('SELECT 1')
    const [, args] = execFileSyncMock.mock.calls[0]
    expect(args?.[args.indexOf('--network') + 1]).toBe('reseau-perso')
    delete process.env.SERVICES_NETWORK
  })

  it('refuse sans WAREHOUSE_DATABASE_URL', () => {
    delete process.env.WAREHOUSE_DATABASE_URL
    expect(() => psqlEntrepot('SELECT 1')).toThrow(/WAREHOUSE_DATABASE_URL/)
  })
})
