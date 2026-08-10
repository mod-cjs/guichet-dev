import type { ReponseHttp } from './http-client'
import { USER_AGENT_ROBOT, UrlInterditeError } from './http-client'
import { ipPubliqueValidee, type Resolver } from './ssrf-guard'

/**
 * GUIC-704 · #5 — rendu headless d'une page SPA (JavaScript exécuté), pour les sources
 * dont le contenu n'existe pas dans le HTML initial (`configExtraction.rendreJs = true`).
 * Réservé aux sources marquées par l'admin → le crawler reste léger/poli par défaut.
 *
 * Sécurité (SSRF conservée malgré le navigateur) :
 *  - l'URL principale est validée AVANT le lancement (hôte interne → refus) ;
 *  - CHAQUE requête du navigateur (page + sous-ressources) est interceptée et re-validée par
 *    résolution DNS → toute cible interne est ABORT. C'est la parade au fait que Chromium
 *    résout le DNS lui-même (pas d'épinglage undici ici).
 *
 * Playwright est importé dynamiquement par l'appelant (`clientHttpReel`) → Chromium n'est
 * chargé QUE si une source SPA existe réellement. Seam `launchImpl` pour les tests.
 */

export interface OptionsRendu {
  timeoutMs?: number
  tailleMaxOctets?: number
  resolver?: Resolver
  /** Injection du lanceur (tests). Défaut : chromium.launch de Playwright. */
  launchImpl?: (o: { headless: boolean }) => Promise<NavigateurMinimal>
}

/** Sous-ensemble de l'API Playwright réellement utilisé (facilite l'injection en test). */
export interface NavigateurMinimal {
  newContext(o: { userAgent: string }): Promise<{
    newPage(): Promise<PageMinimale>
  }>
  close(): Promise<void>
}
export interface PageMinimale {
  route(pattern: string, handler: (route: RouteMinimale) => void | Promise<void>): Promise<void>
  goto(url: string, o: { waitUntil: 'networkidle'; timeout: number }): Promise<{ status(): number } | null>
  content(): Promise<string>
}
export interface RouteMinimale {
  request(): { url(): string }
  continue(): Promise<void>
  abort(): Promise<void>
}

async function lancerChromium(o: { headless: boolean }): Promise<NavigateurMinimal> {
  const { chromium } = await import('playwright')
  return chromium.launch(o) as unknown as NavigateurMinimal
}

export async function rendreHtml(url: string, opts: OptionsRendu = {}): Promise<ReponseHttp> {
  const timeoutMs = opts.timeoutMs ?? 15_000
  const tailleMax = opts.tailleMaxOctets ?? 3_000_000
  const resolver = opts.resolver
  const launch = opts.launchImpl ?? lancerChromium

  // 1) URL principale validée AVANT de lancer le navigateur.
  if (!(await ipPubliqueValidee(url, resolver))) throw new UrlInterditeError(url)

  const navigateur = await launch({ headless: true })
  try {
    const context = await navigateur.newContext({ userAgent: USER_AGENT_ROBOT })
    const page = await context.newPage()

    // 2) SSRF par requête : toute cible interne (page ou sous-ressource) est bloquée.
    await page.route('**', async (route) => {
      const cible = route.request().url()
      if (await ipPubliqueValidee(cible, resolver)) await route.continue()
      else await route.abort()
    })

    const rep = await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })
    const statut = rep?.status() ?? 0
    const html = await page.content()
    const corps = html.length > tailleMax ? html.slice(0, tailleMax) : html
    return { statut, corps, contentType: 'text/html' }
  } finally {
    await navigateur.close()
  }
}
