/**
 * @jest-environment node
 *
 * GUIC-568/571 — Parseur DATABASE_URL partagé (scripts/lib/db-url.sh).
 *
 * Ce parseur alimente la sauvegarde et le déploiement (mariadb-dump). Il a déjà eu un vrai bug :
 * un mot de passe contenant `@` ou `:` cassait l'extraction (host/pass mélangés) → sauvegarde
 * silencieusement corrompue. On teste le script bash RÉEL en l'exécutant, pour que la CI attrape
 * toute régression (y compris une « simplification » du découpage).
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const LIB = join(process.cwd(), 'scripts/lib/db-url.sh')

/** Exécute le vrai parseur bash et renvoie les composants extraits. */
function parse(url: string): { user: string; pass: string; host: string; port: string; name: string } {
  const script = `source "${LIB}"; parse_db_url "$1"; printf '%s\\n%s\\n%s\\n%s\\n%s' "$DB_USER" "$DB_PASS" "$DB_HOST" "$DB_PORT" "$DB_NAME"`
  const out = execFileSync('bash', ['-c', script, 'bash', url], { encoding: 'utf8' })
  const [user, pass, host, port, name] = out.split('\n')
  return { user, pass, host, port, name }
}

describe('GUIC-568/571 — parse_db_url', () => {
  it('parse une URL standard', () => {
    expect(parse('mysql://guichet:secret@host.docker.internal:3306/guichet_jeunesse')).toEqual({
      user: 'guichet',
      pass: 'secret',
      host: 'host.docker.internal',
      port: '3306',
      name: 'guichet_jeunesse',
    })
  })

  it('préserve un mot de passe contenant @ ET : (le bug d’origine)', () => {
    const r = parse('mysql://u:p@ss:w0rd@dbhost:3307/mydb')
    expect(r).toEqual({ user: 'u', pass: 'p@ss:w0rd', host: 'dbhost', port: '3307', name: 'mydb' })
  })

  it('utilise le port 3306 par défaut quand il est absent', () => {
    expect(parse('mysql://u:pw@dbhost/mydb')).toEqual({
      user: 'u',
      pass: 'pw',
      host: 'dbhost',
      port: '3306',
      name: 'mydb',
    })
  })

  it('gère le mot de passe fort réel (alphanumérique, 32 car.)', () => {
    const r = parse('mysql://GUICHET:fHQRz81xkxaYg7GFchfZxztLCw4qmLhe@redis_cjs:3306/guichet')
    expect(r.user).toBe('GUICHET')
    expect(r.pass).toBe('fHQRz81xkxaYg7GFchfZxztLCw4qmLhe')
    expect(r.host).toBe('redis_cjs')
    expect(r.port).toBe('3306')
  })
})
