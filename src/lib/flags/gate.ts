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

/** Rendues par réécriture : l'URL demandée reste affichée. */
const PAGE_MUETTE = '/masque'
const PAGE_EXPLICITE = '/indisponible'

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

  // Un accès refusé sur un module censé invisible est le seul signal de fuite disponible.
  await recordFlagBlock(key)

  // Réécriture et non redirection : une redirection changerait l'URL affichée et
  // révélerait le dispositif. Ici l'URL demandée reste, avec un 404 ordinaire.
  const cible = def.silentClose ? PAGE_MUETTE : PAGE_EXPLICITE
  return NextResponse.rewrite(new URL(cible, request.nextUrl.origin))
}
