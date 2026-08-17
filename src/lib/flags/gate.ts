// GUIC-706 — Gate des fonctionnalités masquées.
//
// Appelé par `src/middleware.ts` AVANT tout le reste, y compris avant le contrôle
// d'authentification : une route masquée doit répondre comme une route inexistante, sans
// même laisser entendre qu'il faudrait se connecter pour y accéder.
//
// Spec : `.agent_context/specs/GUIC-706-feature-flags.md` §2.1, §2.2, §5.4.

import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getFlags } from '@/lib/flags'
import { recordFlagBlock } from '@/lib/flags/metrics'
import { aUnEngagement } from '@/lib/flags/engagements'
import { flagForPath, getFlagDef, resolveAudience } from '@/lib/flags/catalog'

/**
 * Surfaces machine, jamais fermées par le gate.
 *
 * Un webhook qui répond 404 fait retrier Meta et le SSO en boucle ; un cron qui répond 404
 * est compté comme un échec d'exécution et déclenche des alertes pour une fermeture
 * pourtant volontaire. Ces routes se refusent elles-mêmes — 200 silencieux pour un
 * webhook, court-circuit déclaré pour un cron — et c'est le lot 4 qui s'en charge.
 */
const SURFACES_MACHINE = ['/api/whatsapp', '/api/webhooks', '/api/interconnexion', '/api/cron', '/api/internal']

/**
 * Cibles de réécriture — l'URL demandée reste affichée dans la barre d'adresse.
 *
 * `PAGE_MUETTE` ne correspond volontairement à AUCUNE route : Next sert alors son
 * not-found, exactement comme pour une adresse inventée. Une page dédiée appelant
 * `notFound()` a été essayée et écartée — elle renvoie bien un 404 mais avec un corps
 * vide, donc visiblement différent d'un vrai 404, ce qui trahit le dispositif au lieu de
 * le dissimuler. Un test interdit qu'une route vienne un jour occuper ce chemin.
 */
const PAGE_MUETTE = '/__introuvable'
const PAGE_EXPLICITE = '/indisponible'

/** Exporté pour que les tests vérifient qu'aucune route ne l'occupe. */
export const CIBLE_MUETTE = PAGE_MUETTE

/**
 * Réponse à substituer quand la route relève d'une fonctionnalité masquée pour le
 * visiteur, ou `null` pour laisser la requête suivre son cours.
 */
export async function gateFlags(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  if (SURFACES_MACHINE.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null

  // `flagForPath` écarte déjà les chemins d'administration (§2.1).
  const key = flagForPath(pathname)
  if (!key) return null

  let flags: Record<string, boolean>
  try {
    flags = await getFlags()
  } catch (err) {
    // `getFlags` ne rejette pas en théorie. Si l'impossible arrive, on laisse passer : une
    // panne interne ne doit pas rendre la plateforme inaccessible. C'est l'inverse du
    // repli de `getFlags` — là on protège la confidentialité d'une fermeture décidée, ici
    // la disponibilité du service.
    logger.warn('[flags] gate dégradé, requête laissée passer', { pathname, err: String(err) })
    return null
  }

  if (flags[key] !== false) return null

  const def = getFlagDef(key)
  if (!def) return null

  // Session lue seulement ici : le gate s'exécute à chaque requête, la lire sur le chemin
  // nominal ferait payer en permanence un cas rare.
  const session = await getSession(request)
  const face = resolveAudience(session?.roles)

  // L'administration voit la vraie page — c'est ainsi qu'elle relit ce qu'elle s'apprête
  // à ouvrir (§2.1).
  if (face === 'admin') return null
  if (!def.closes.includes(face)) return null

  // FERMETURE PROGRESSIVE — l'entrée ferme, la sortie reste ouverte au titulaire d'un
  // engagement en cours, et à lui seul. Un jeune qui a un livre chez lui doit continuer de
  // voir sa date de retour : sans cela il passerait en retard sans le savoir, pour une
  // décision d'administration.
  //
  // La lecture n'a lieu que sur une route de SORTIE. L'interroger sur toutes les routes
  // masquées serait un coût permanent pour un cas rare.
  const surSortie = def.drainRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  )
  if (surSortie && (await aUnEngagement(key, session?.cjsUid))) return null

  // Un accès refusé sur un module censé invisible est le seul signal de fuite disponible.
  await recordFlagBlock(key)

  // Réécriture et non redirection : une redirection changerait l'URL affichée et
  // révélerait le dispositif. Ici l'URL demandée reste, avec un 404 ordinaire.
  const cible = def.silentClose ? PAGE_MUETTE : PAGE_EXPLICITE
  return NextResponse.rewrite(new URL(cible, request.nextUrl.origin))
}
