/**
 * @jest-environment node
 *
 * GUIC-706 — Invariants du catalogue de fonctionnalités.
 *
 * Le catalogue est la source de vérité du lancement séquentiel : une erreur ici ne
 * produit pas un bug visible mais une **fuite silencieuse** (un module censé masqué qui
 * reste accessible) ou un **verrou mort** (un flag qu'on ne peut plus rouvrir). D'où des
 * invariants testés plutôt que documentés.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  FEATURE_FLAGS,
  getFlagDef,
  catalogDefaults,
  flagForPath,
  resolveAudience,
} from '@/lib/flags/catalog'

const KEYS = new Set(FEATURE_FLAGS.map((f) => f.key))

describe('catalogue — intégrité structurelle', () => {
  it('n’a aucune clé dupliquée', () => {
    expect(KEYS.size).toBe(FEATURE_FLAGS.length)
  })

  it('n’a que des clés `module.fonction` stables', () => {
    for (const f of FEATURE_FLAGS) {
      expect(f.key).toMatch(/^[a-z0-9]+\.[a-z0-9_]+$/)
    }
  })

  it('résout toutes les dépendances déclarées', () => {
    for (const f of FEATURE_FLAGS) {
      for (const dep of [...f.dependsOn, ...f.requires]) {
        expect(KEYS.has(dep)).toBe(true)
      }
    }
  })

  it('ne contient aucun cycle de dépendance', () => {
    // `dependsOn` est un ordre partiel : un cycle rendrait un flag impossible à ouvrir,
    // chacun attendant l'autre. Parcours en profondeur avec pile de visite.
    const enCours = new Set<string>()
    const vus = new Set<string>()
    const visite = (key: string, chemin: string[]): void => {
      if (enCours.has(key)) {
        throw new Error(`Cycle de dépendance : ${[...chemin, key].join(' → ')}`)
      }
      if (vus.has(key)) return
      enCours.add(key)
      for (const dep of getFlagDef(key)?.dependsOn ?? []) visite(dep, [...chemin, key])
      enCours.delete(key)
      vus.add(key)
    }
    expect(() => FEATURE_FLAGS.forEach((f) => visite(f.key, []))).not.toThrow()
  })
})

describe('catalogue — règles de sûreté', () => {
  it('n’a aucun flag verrouillé qui démarre masqué', () => {
    // Un `locked: true` avec `defaultEnabled: false` serait un verrou mort : impossible à
    // ouvrir depuis l'admin (le toggle est grisé) et masqué par défaut.
    for (const f of FEATURE_FLAGS.filter((x) => x.locked)) {
      expect(f.defaultEnabled).toBe(true)
    }
  })

  it('ne ferme jamais la face admin', () => {
    // §2.1 — la console admin est hors périmètre des flags, sans exception.
    for (const f of FEATURE_FLAGS) {
      expect(f.closes).not.toContain('admin')
    }
  })

  it('n’a pas de flag sans face qui prétendrait fermer des routes utilisateur', () => {
    // `closes: []` désigne un flag interne (ex. évaluation Yaye) : il ne doit alors ni
    // fermer de route utilisateur ni masquer d'entrée de navigation.
    for (const f of FEATURE_FLAGS.filter((x) => x.closes.length === 0)) {
      expect(f.userRoutes).toHaveLength(0)
      expect(f.navIds).toHaveLength(0)
    }
  })

  it('ne place jamais de route admin parmi les routes fermées', () => {
    for (const f of FEATURE_FLAGS) {
      for (const route of f.userRoutes) expect(route.startsWith('/admin')).toBe(false)
      for (const prefix of f.apiPrefixes) expect(prefix.startsWith('/api/admin')).toBe(false)
    }
  })

  it('ne déclare comme routes admin que des chemins d’administration', () => {
    for (const f of FEATURE_FLAGS) {
      for (const route of f.adminRoutes) {
        expect(route.startsWith('/admin') || route.startsWith('/api/admin')).toBe(true)
      }
    }
  })

  it('ne rend explicite une fermeture que devant un public identifié', () => {
    // §2.2 — l'invisibilité protège d'une divulgation à un public inconnu. Un recruteur ou
    // un conseiller est une personne rattachée, sous contrat : lui opposer un 404 muet
    // dégrade son travail sans rien protéger, et le support n'a rien à lui répondre.
    // Mais l'exception ne doit jamais déborder sur les visiteurs et les jeunes, sinon la
    // règle d'invisibilité tombe par une porte dérobée.
    const PROFESSIONNELS = new Set(['recruteur', 'conseiller'])
    for (const f of FEATURE_FLAGS.filter((x) => x.silentClose === false)) {
      expect(f.closes.length).toBeGreaterThan(0)
      for (const audience of f.closes) expect(PROFESSIONNELS.has(audience)).toBe(true)
    }
  })

  it('associe un inventaire d’engagements à toute fermeture progressive', () => {
    // §7.1 — sans inventaire, l'admin basculerait à l'aveugle sur un module où des
    // utilisateurs ont un engagement en cours (livre emprunté, créneau réservé).
    for (const f of FEATURE_FLAGS) {
      if (f.closeMode === 'drain') expect(f.engagements).toBeDefined()
      else expect(f.engagements).toBeUndefined()
    }
  })
})

describe('catalogue — couverture des espaces de travail', () => {
  /**
   * Un espace professionnel est le poste de travail de quelqu'un. Chacune de ses pages
   * doit relever d'un flag qui ferme SON public — sinon la seule façon de retirer un outil
   * à un conseiller est de lui fermer tout son espace, ce qui n'est pas un réglage mais
   * une mise à l'arrêt.
   *
   * Le piège est discret : `/conseiller/bibliotheque` relève naturellement du flag
   * « bibliothèque », lequel ne ferme que les jeunes. La route est donc couverte, et
   * pourtant le comptoir du conseiller reste impossible à fermer seul.
   */
  const ESPACES: { prefixe: string; audience: string }[] = [
    { prefixe: '/conseiller', audience: 'conseiller' },
    { prefixe: '/recruteur', audience: 'recruteur' },
  ]

  function pagesDe(prefixe: string): string[] {
    const racine = resolve(__dirname, '..', '..', 'src', 'app', prefixe.slice(1))
    const out: string[] = []
    const walk = (dir: string, url: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) {
          if (e.name === 'page.tsx') out.push(url)
          continue
        }
        if (e.name.startsWith('_') || e.name.startsWith('@')) continue
        walk(join(dir, e.name), url + (e.name.startsWith('(') ? '' : `/${e.name}`))
      }
    }
    walk(racine, prefixe)
    return out
  }

  it.each(ESPACES)('rend chaque page de $prefixe fermable pour son public', ({ prefixe, audience }) => {
    const orphelines = pagesDe(prefixe).filter((route) => {
      const key = flagForPath(route.replace(/\[[^\]]+\]/g, 'x'))
      return !key || !getFlagDef(key)?.closes.includes(audience as never)
    })
    expect(orphelines).toEqual([])
  })
})

describe('catalogue — couverture des tâches planifiées', () => {
  const crons: string[] = JSON.parse(
    readFileSync(resolve(__dirname, '..', '..', 'vercel.json'), 'utf8'),
  ).crons.map((c: { path: string }) => c.path)

  it('n’attribue jamais la même tâche planifiée à deux flags', () => {
    // Deux flags sur un même cron rendraient son exécution dépendante d'un ordre
    // d'évaluation implicite.
    const vus = new Map<string, string>()
    for (const f of FEATURE_FLAGS) {
      for (const cron of f.crons) {
        expect(vus.has(cron)).toBe(false)
        vus.set(cron, f.key)
      }
    }
  })

  it('ne référence que des tâches réellement planifiées', () => {
    // Un cron référencé mais absent de vercel.json signale un renommage non répercuté :
    // le flag croirait le couper alors qu'il ne coupe rien.
    for (const f of FEATURE_FLAGS) {
      for (const cron of f.crons) expect(crons).toContain(cron)
    }
  })
})

describe('catalogDefaults', () => {
  it('donne une valeur à chaque flag du catalogue', () => {
    const defauts = catalogDefaults()
    expect(Object.keys(defauts).sort()).toEqual([...KEYS].sort())
  })
})

describe('flagForPath', () => {
  it('rattache une route au flag qui la couvre', () => {
    expect(flagForPath('/agenda')).toBe('m5.agenda')
    expect(flagForPath('/agenda/42')).toBe('m5.agenda')
  })

  it('retient le préfixe le plus spécifique', () => {
    // `/jeune/bibliotheque/mes-emprunts` relève de la bibliothèque, pas d'un préfixe plus
    // court qui l'engloberait.
    expect(flagForPath('/jeune/bibliotheque/mes-emprunts')).toBe('m4.bibliotheque')
  })

  it('ne rattache jamais une route d’administration', () => {
    // §2.1 — le middleware ne doit pas pouvoir fermer la console admin, même si un
    // préfixe du catalogue venait à l'englober par accident.
    expect(flagForPath('/admin/evenements')).toBeNull()
    expect(flagForPath('/api/admin/systeme/flags')).toBeNull()
  })

  it('laisse passer une route non couverte', () => {
    expect(flagForPath('/auth/connexion')).toBeNull()
    expect(flagForPath('/legal/cgu')).toBeNull()
  })
})

describe('resolveAudience', () => {
  it('traite un visiteur sans session comme anonyme', () => {
    expect(resolveAudience(null)).toBe('anonyme')
    expect(resolveAudience([])).toBe('anonyme')
  })

  it('reconnaît l’administration avant tout autre rôle', () => {
    expect(resolveAudience(['admin', 'beneficiaire'])).toBe('admin')
    expect(resolveAudience(['moderator'])).toBe('admin')
  })

  it('fait primer le rôle métier sur le rôle bénéficiaire hérité', () => {
    // `rolesPourDevLogin` et le SSO accordent TOUJOURS `beneficiaire` en plus du rôle
    // métier. Prendre « le premier rôle trouvé » appliquerait la face bénéficiaire à un
    // conseiller, qui perdrait son comptoir alors qu'il doit continuer de préparer.
    expect(resolveAudience(['conseiller', 'beneficiaire'])).toBe('conseiller')
    expect(resolveAudience(['beneficiaire', 'conseiller'])).toBe('conseiller')
    expect(resolveAudience(['recruteur', 'beneficiaire'])).toBe('recruteur')
  })

  it('fait primer le conseiller sur le recruteur en cas de cumul', () => {
    expect(resolveAudience(['recruteur', 'conseiller', 'beneficiaire'])).toBe('conseiller')
  })

  it('retombe sur bénéficiaire pour un rôle inconnu', () => {
    expect(resolveAudience(['jeune'])).toBe('beneficiaire')
  })
})
