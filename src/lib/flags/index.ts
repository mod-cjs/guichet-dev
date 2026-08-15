// GUIC-706 — Résolution de l'état des fonctionnalités.
//
// Ordre : cache mémoire (validé par version) → Redis → base → catalogue.
//
// POURQUOI UN COMPTEUR DE VERSION plutôt qu'un simple TTL. Le middleware s'exécute à
// chaque requête : relire la carte complète à chaque fois serait un appel réseau sur le
// chemin critique, mais un cache mémoire à durée fixe fait bien pire qu'ajouter de la
// latence — il rend les instances INCOHÉRENTES entre elles. Une page rendue par
// l'instance A (module encore ouvert) déclenche un fetch qui atterrit sur l'instance B
// (module déjà masqué) : 404 en plein écran sur une page qui vient de s'afficher.
// On lit donc un entier à chaque requête et la carte seulement quand il change.
//
// Spec : `.agent_context/specs/GUIC-706-feature-flags.md` §3.3 et §8.1.

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { catalogDefaults, getFlagDef, FEATURE_FLAGS } from './catalog'

export type FlagMap = Record<string, boolean>

const CLE_CARTE = 'flags:all'
const CLE_VERSION = 'flags:version'

/** Dernière carte connue de ce processus, avec la version qui l'a produite. */
let cache: { version: string; map: FlagMap } | null = null

/** Remet le cache de processus à zéro. Réservé aux tests. */
export function __resetFlagsCache(): void {
  cache = null
}

/** Carte complète = défauts du catalogue + surcharges de la base, clés inconnues ignorées. */
function fusionne(surcharges: { key: string; enabled: boolean }[]): FlagMap {
  const map = catalogDefaults()
  for (const { key, enabled } of surcharges) {
    // Une clé retirée du code laisse sa ligne en base : l'ignorer évite qu'un flag
    // disparu réapparaisse dans la carte.
    if (getFlagDef(key)) map[key] = enabled
  }
  return map
}

async function lireBase(): Promise<FlagMap> {
  const lignes = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } })
  return fusionne(lignes)
}

/**
 * État effectif de toutes les fonctionnalités.
 *
 * Ne rejette jamais : une panne d'infrastructure ne doit pas empêcher une page de rendre.
 * Le repli est **orienté** — on préfère la dernière carte connue aux défauts du catalogue,
 * sinon une coupure Redis rouvrirait au public exactement ce qu'on vient de masquer.
 */
export async function getFlags(): Promise<FlagMap> {
  let version: string | null = null
  try {
    version = await redis.get(CLE_VERSION)
  } catch (err) {
    logger.warn('[flags] version illisible', { err: String(err) })
    if (cache) return cache.map
  }

  const v = version ?? '0'
  if (cache && cache.version === v) return cache.map

  try {
    const brut = await redis.get(CLE_CARTE)
    if (brut) {
      const map = fusionne(
        Object.entries(JSON.parse(brut) as FlagMap).map(([key, enabled]) => ({ key, enabled })),
      )
      cache = { version: v, map }
      return map
    }
  } catch (err) {
    logger.warn('[flags] carte illisible', { err: String(err) })
  }

  try {
    const map = await lireBase()
    cache = { version: v, map }
    try {
      await redis.set(CLE_CARTE, JSON.stringify(map))
    } catch {
      /* le cache n'est qu'une optimisation */
    }
    return map
  } catch (err) {
    logger.warn('[flags] base illisible', { err: String(err) })
    // Démarrage à froid, sans aucune carte connue : le catalogue est le seul état sûr.
    return cache?.map ?? catalogDefaults()
  }
}

/**
 * Vrai si la fonctionnalité est ouverte.
 *
 * Une clé absente du catalogue répond `false` : une faute de frappe dans un appelant ne
 * doit pas ouvrir un accès.
 */
export async function isEnabled(key: string): Promise<boolean> {
  if (!getFlagDef(key)) return false
  return (await getFlags())[key] === true
}

export interface SetFlagOptions {
  /** `cjs_uid` de l'administrateur — tracé en base et au journal d'audit. */
  updatedBy: string
  /** Raison de la bascule (vague d'ouverture, incident…). */
  note?: string
}

/**
 * Vérifie qu'une bascule est légitime dans un état donné, sans rien écrire.
 *
 * Extrait de `setFlag` pour que `setFlags` puisse valider TOUTE la séquence avant d'en
 * appliquer la moindre étape : c'est ce qui rend la cascade atomique.
 *
 * @throws si la clé est inconnue, verrouillée, ou si une dépendance s'y oppose.
 */
function valideBascule(key: string, enabled: boolean, courant: FlagMap): void {
  const def = getFlagDef(key)
  if (!def) throw new Error(`Fonctionnalité inconnue : ${key}`)
  if (def.locked) throw new Error(`Fonctionnalité verrouillée : ${key}`)

  if (enabled) {
    const manquantes = def.dependsOn.filter((dep) => courant[dep] !== true)
    if (manquantes.length > 0) {
      throw new Error(
        `Impossible d’ouvrir ${key} : ${manquantes.join(', ')} ${manquantes.length > 1 ? 'sont masquées' : 'est masquée'}.`,
      )
    }
  } else {
    // Symétrique : masquer un parent laisserait ses enfants dans un état inatteignable.
    const dependants = FEATURE_FLAGS.filter(
      (f) => f.dependsOn.includes(key) && courant[f.key] === true,
    )
    if (dependants.length > 0) {
      throw new Error(
        `Impossible de masquer ${key} : ${dependants.map((f) => f.key).join(', ')} en dépend${dependants.length > 1 ? 'ent' : ''}.`,
      )
    }
  }
}

/**
 * Bascule UNE fonctionnalité. Cas particulier d'une séquence à un élément.
 *
 * La validation vit côté service et non seulement côté interface : un toggle grisé
 * n'empêche pas un appel direct à l'API.
 */
export async function setFlag(
  key: string,
  enabled: boolean,
  options: SetFlagOptions,
): Promise<FlagMap> {
  return setFlags([{ key, enabled }], options)
}

/**
 * Applique une SÉQUENCE de bascules — le geste de groupe (§ cascade).
 *
 * ATOMIQUE : toute la séquence est validée sur l'état simulé avant la première écriture.
 * Sans cela, une séquence interrompue laisserait un parent ouvert et ses enfants fermés,
 * soit exactement l'état incohérent que les dépendances servent à empêcher. Mieux vaut ne
 * rien faire que faire à moitié.
 *
 * @throws si la séquence est vide, ou si l'une de ses étapes est refusée.
 */
export async function setFlags(
  bascules: readonly { key: string; enabled: boolean }[],
  { updatedBy, note }: SetFlagOptions,
): Promise<FlagMap> {
  if (bascules.length === 0) throw new Error('Aucune bascule demandée.')

  const courant = await getFlags()

  // Validation intégrale sur un état SIMULÉ : chaque étape est jugée dans l'état que les
  // précédentes auront produit, sans quoi une cascade légitime serait refusée à sa
  // deuxième étape.
  const simule: FlagMap = { ...courant }
  for (const { key, enabled } of bascules) {
    valideBascule(key, enabled, simule)
    simule[key] = enabled
  }

  for (const { key, enabled } of bascules) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, note: note ?? null, updatedBy },
      update: { enabled, note: note ?? null, updatedBy },
    })
  }

  const map = simule

  // ORDRE IMPOSÉ : la carte d'abord, la version ensuite. Une instance qui verrait la
  // nouvelle version avant la nouvelle carte relirait l'ancienne et se croirait à jour
  // jusqu'à la bascule suivante.
  try {
    await redis.set(CLE_CARTE, JSON.stringify(map))
    const v = await redis.incr(CLE_VERSION)
    cache = { version: String(v), map }
  } catch (err) {
    // La base fait foi ; le cache n'est qu'une optimisation. Une panne Redis ne doit pas
    // empêcher l'admin de couper une fonctionnalité en incident.
    logger.warn('[flags] publication du cache échouée', { err: String(err) })
    cache = null
  }

  return map
}
