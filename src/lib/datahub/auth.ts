/**
 * M13 / Data Hub — authentification des consommateurs de l'API d'export (spec §6.3).
 *
 * GÉNÉRALISE LA GARDE DE GUIC-631. La forme faible `clef !== process.env.X` accorde
 * l'accès quand la variable est absente et que l'appelant n'envoie aucun en-tête :
 * `undefined !== undefined` est faux. Le cas s'est produit sur un environnement où la
 * variable n'avait pas été propagée. Ici l'absence de configuration REFUSE, toujours.
 *
 * COMPARAISON À TEMPS CONSTANT — une clé API est un secret. Une comparaison de chaînes
 * s'arrête au premier caractère différent : le temps de réponse fuit alors la clé,
 * caractère par caractère, à qui prend la peine de le mesurer. On compare des empreintes
 * de longueur fixe, `timingSafeEqual` refusant des tampons de tailles différentes.
 *
 * DEUX FORMES DE CONFIGURATION. `DATAHUB_API_KEYS` porte des clés nommées
 * (`meltano:secret,bi:autre`) : le nom identifie le consommateur dans le journal d'audit,
 * et plusieurs clés valides à la fois rendent la rotation possible sans coupure.
 * `DATAHUB_API_KEY` reste accepté seul, pour ne pas casser les déploiements existants.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

export interface DatahubConsumer {
  /** Identifiant du consommateur, journalisé à chaque extraction. */
  id: string
}

/** Nom donné au porteur de la clé unique héritée, qui n'en déclare pas. */
const ID_HERITE = 'datahub'

function empreinte(valeur: string): Buffer {
  return createHash('sha256').update(valeur, 'utf8').digest()
}

function egalConstant(a: string, b: string): boolean {
  return timingSafeEqual(empreinte(a), empreinte(b))
}

/** Clés valides, nom → secret. Vide si rien n'est configuré : tout sera refusé. */
function clesConfigurees(): Array<{ id: string; secret: string }> {
  const nommees = process.env.DATAHUB_API_KEYS?.trim()
  if (nommees) {
    return nommees
      .split(',')
      .map((entree) => {
        const separateur = entree.indexOf(':')
        if (separateur <= 0) return null
        const id = entree.slice(0, separateur).trim()
        const secret = entree.slice(separateur + 1).trim()
        // Une entrée malformée est ignorée, jamais promue en clé sans nom : sinon une
        // virgule de trop dans la variable ouvrirait un accès anonyme.
        return id && secret ? { id, secret } : null
      })
      .filter((c): c is { id: string; secret: string } => c !== null)
  }

  const unique = process.env.DATAHUB_API_KEY?.trim()
  return unique ? [{ id: ID_HERITE, secret: unique }] : []
}

/**
 * Secret porté par un en-tête `Authorization`, ou `null` si la forme n'est pas conforme.
 * Le schéma est insensible à la casse (RFC 7235 §2.1, GUIC-697 D5) : `bearer`/`BEARER`
 * sont des formes valides, même si le tap actuel envoie toujours `Bearer` exact.
 */
function secretPorte(authorization: string | null): string | null {
  if (!authorization) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization.trim())
  return match ? match[1] : null
}

/**
 * Consommateur authentifié, ou `null`. Un `null` doit produire un 401 — jamais un accès
 * dégradé.
 */
export function authenticateDatahub(authorization: string | null): DatahubConsumer | null {
  const cles = clesConfigurees()
  if (cles.length === 0) return null

  const presente = secretPorte(authorization)
  if (presente === null) return null

  // Toutes les clés sont comparées, sans court-circuit : sortir à la première
  // correspondance rendrait le temps de réponse dépendant du rang de la clé.
  let trouve: DatahubConsumer | null = null
  for (const cle of cles) {
    if (egalConstant(presente, cle.secret)) trouve = { id: cle.id }
  }
  return trouve
}
