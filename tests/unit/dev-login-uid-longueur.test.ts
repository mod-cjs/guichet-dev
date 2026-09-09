/**
 * @jest-environment node
 *
 * Sentinelle : tout `cjs_uid` codé en dur dans les routes /api/dev/login-* DOIT tenir
 * dans la colonne `cjs_uid`, déclarée `VarChar(36)` dans l'ensemble du schéma.
 *
 * Pourquoi ce test existe (constat live du 2026-07-21) :
 * `DEV_ADMIN_UID` valait `dev-admin-<uuid>`, soit 46 caractères. La session s'ouvrait
 * normalement — le uid ne transite que par le cookie signé — mais TOUTE écriture en base
 * portant ce uid était rejetée par MariaDB (« Data too long for column 'cjs_uid' »).
 *
 * Le défaut était invisible : l'insertion dans `centre_events` est fail-soft, elle
 * n'émettait qu'un `logger.warn` et l'admin de démo continuait de fonctionner. Seule la
 * lecture des logs du conteneur révélait que l'analytics était perdue pour ces sessions.
 *
 * ⚠️ PORTÉE RÉELLE — à lire avant de se croire couvert :
 * la route fautive (`src/app/api/dev/login-admin/`) est listée dans `.git/info/exclude`,
 * comme login-conseiller, login-recruteur et score-backfill : elles contournent le SSO et
 * ne sont volontairement PAS versionnées. En CI, ce test ne voit donc QUE
 * `src/app/api/dev/login/` — la seule route dev de connexion présente dans le dépôt.
 *
 * Autrement dit : cette sentinelle n'aurait PAS attrapé le défaut d'origine en CI. Elle
 * garde les routes versionnées et toute route dev future ajoutée au dépôt ; la correction
 * de `DEV_ADMIN_UID` elle-même reste locale à chaque poste (cf. GUIC-641).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DEV_API_DIR = join(process.cwd(), 'src', 'app', 'api', 'dev')
const SCHEMA = join(process.cwd(), 'prisma', 'schema.prisma')

/** `cjs_uid   String   @map("cjs_uid") @db.VarChar(36)` → capture la longueur déclarée. */
const RE_CJS_UID_VARCHAR = /@map\("cjs_uid"\)[^\n]*@db\.VarChar\((\d+)\)/g

/** `const XXX_UID = '...'` → capture le nom de la constante et sa valeur. */
const RE_UID_CONST = /const\s+([A-Z0-9_]*UID)\s*=\s*'([^']*)'/g

/**
 * Longueur maximale d'un `cjs_uid`, lue depuis le schéma Prisma plutôt que codée en dur :
 * si la colonne est un jour élargie, la sentinelle suit sans intervention.
 */
function longueurMaxCjsUid(): number {
  const schema = readFileSync(SCHEMA, 'utf8')
  const longueurs = [...schema.matchAll(RE_CJS_UID_VARCHAR)].map((m) => Number(m[1]))

  expect(longueurs.length).toBeGreaterThan(0)
  // Toutes les déclarations doivent être cohérentes : on prend la plus contraignante,
  // qui est celle qui rejettera l'écriture en premier.
  return Math.min(...longueurs)
}

interface UidDeclare {
  fichier: string
  constante: string
  valeur: string
}

/**
 * Tous les uid codés en dur dans les routes /api/dev/login-*.
 *
 * GUIC-642 — on lisait `route.ts` dans TOUT dossier `login*`, en supposant qu'un
 * dossier présent contient sa route. Les dossiers `login-admin`,
 * `login-conseiller` et `login-recruteur` étant hors dépôt (`.git/info/exclude`),
 * leur état varie d'un poste à l'autre : absents en CI, et ici présents mais
 * VIDES après une copie incomplète du dépôt qui a emporté les fichiers non
 * versionnés. Le test plantait alors en ENOENT sur toute la machine.
 *
 * On indexe donc sur les fichiers réellement présents, pas sur les dossiers.
 */
function uidsDeclares(): UidDeclare[] {
  return readdirSync(DEV_API_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('login'))
    .flatMap((e) => {
      const fichier = join(DEV_API_DIR, e.name, 'route.ts')
      if (!existsSync(fichier)) return []
      const source = readFileSync(fichier, 'utf8')
      return [...source.matchAll(RE_UID_CONST)].map((m) => ({
        fichier: `${e.name}/route.ts`,
        constante: m[1],
        valeur: m[2],
      }))
    })
}

describe('cjs_uid des routes /api/dev/login-*', () => {
  it('déclare au moins un uid (garde-fou : le test ne doit pas passer à vide)', () => {
    expect(uidsDeclares().length).toBeGreaterThan(0)
  })

  it('tient dans la colonne cjs_uid pour chaque route dev', () => {
    const max = longueurMaxCjsUid()
    const trop_longs = uidsDeclares().filter((u) => u.valeur.length > max)

    expect(
      trop_longs.map((u) => `${u.fichier} — ${u.constante} = ${u.valeur.length} car. (max ${max})`),
    ).toEqual([])
  })
})
