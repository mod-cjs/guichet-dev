/**
 * @jest-environment node
 *
 * GUIC-700 — Protection NO_ZERO_DATE/NO_ZERO_IN_DATE sur les connexions Guichet SEULEMENT,
 * pas sur le serveur MariaDB partagé.
 *
 * Trouvé en préparant l'intégration préprod : la MariaDB Plesk est mutualisée avec la SSO
 * ET le BRM. La SSO (Laravel `strict => true`) s'impose déjà son propre `sql_mode` par
 * connexion — un changement global la rattraperait sans rien casser. Mais BRM
 * (`strict => false`, aucun override Laravel) HÉRITE entièrement du `sql_mode` global :
 * un `SET GLOBAL` l'exposerait à un risque non vérifiable depuis ce dépôt.
 *
 * `avecSqlModeStrict` pose donc la même protection que la SSO, mais via `sessionVariables`
 * du driver `mariadb` (https://github.com/mariadb-corporation/mariadb-connector-nodejs) —
 * un `SET @@sql_mode=?` exécuté à l'ouverture de CHAQUE connexion Guichet, jamais sur le
 * serveur. Zéro portée sur BRM ou la SSO.
 */
import { avecSqlModeStrict } from '@/lib/prisma'

describe('GUIC-700 — avecSqlModeStrict : sql_mode sur les connexions Guichet seulement', () => {
  it('ajoute sessionVariables avec NO_ZERO_DATE et NO_ZERO_IN_DATE', () => {
    const url = avecSqlModeStrict('mariadb://user:pass@host:3306/db')
    const parsed = new URL(url)
    const sessionVariables = JSON.parse(parsed.searchParams.get('sessionVariables')!)
    expect(sessionVariables.sql_mode).toContain('NO_ZERO_DATE')
    expect(sessionVariables.sql_mode).toContain('NO_ZERO_IN_DATE')
    expect(sessionVariables.sql_mode).toContain('STRICT_TRANS_TABLES')
  })

  it('préserve le reste de la chaîne de connexion (utilisateur, mot de passe, hôte, base)', () => {
    const url = avecSqlModeStrict('mariadb://guichet:secret@127.0.0.1:3306/guichet_test')
    const parsed = new URL(url)
    expect(parsed.username).toBe('guichet')
    expect(parsed.password).toBe('secret')
    expect(parsed.hostname).toBe('127.0.0.1')
    expect(parsed.port).toBe('3306')
    expect(parsed.pathname).toBe('/guichet_test')
  })

  it('préserve les query params déjà présents sur la chaîne de connexion', () => {
    const url = avecSqlModeStrict('mariadb://user:pass@host:3306/db?sslmode=require')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('sslmode')).toBe('require')
    expect(parsed.searchParams.has('sessionVariables')).toBe(true)
  })

  it('ne double pas sessionVariables si déjà présent (idempotent)', () => {
    const url = avecSqlModeStrict(avecSqlModeStrict('mariadb://user:pass@host:3306/db'))
    const parsed = new URL(url)
    expect(parsed.searchParams.getAll('sessionVariables')).toHaveLength(1)
  })
})
