/**
 * @jest-environment node
 *
 * GUIC-704 · #5 — rendu headless SPA : la SÉCURITÉ SSRF doit survivre au navigateur.
 * Playwright résout le DNS lui-même (pas d'épinglage undici) → on valide (a) l'URL
 * principale AVANT lancement, (b) CHAQUE requête interceptée. Testé avec un lanceur et un
 * resolver injectés → déterministe, sans vrai Chromium.
 */
import { rendreHtml, type NavigateurMinimal, type RouteMinimale } from '@/lib/curation/robot/rendu-js'
import { UrlInterditeError } from '@/lib/curation/robot/http-client'

const resolverPublic = async () => ['41.82.10.5']
// evil.internal → IP interne ; le reste → public.
const resolverMixte = async (h: string) => (h === 'evil.internal' ? ['169.254.169.254'] : ['41.82.10.5'])

function fauxNavigateur() {
  const etat = { lance: false, ferme: false, handler: null as null | ((r: RouteMinimale) => void | Promise<void>) }
  const page = {
    async route(_p: string, h: (r: RouteMinimale) => void | Promise<void>) { etat.handler = h },
    async goto() { return { status: () => 200 } },
    async content() { return '<html><body>contenu rendu par JS</body></html>' },
  }
  const nav: NavigateurMinimal = {
    async newContext() { return { async newPage() { return page } } },
    async close() { etat.ferme = true },
  }
  const launchImpl = async () => { etat.lance = true; return nav }
  return { etat, launchImpl }
}

function route(url: string) {
  const rec = { continue: false, abort: false }
  const r: RouteMinimale = {
    request: () => ({ url: () => url }),
    async continue() { rec.continue = true },
    async abort() { rec.abort = true },
  }
  return { r, rec }
}

describe('GUIC-704 — rendreHtml (SSRF conservée)', () => {
  it('URL principale interne → UrlInterditeError SANS lancer le navigateur', async () => {
    const { etat, launchImpl } = fauxNavigateur()
    await expect(
      rendreHtml('http://evil.internal/x', { resolver: resolverMixte, launchImpl }),
    ).rejects.toBeInstanceOf(UrlInterditeError)
    expect(etat.lance).toBe(false) // jamais de Chromium pour une cible interne
  })

  it('URL publique → rend le contenu (JS exécuté) et ferme le navigateur', async () => {
    const { etat, launchImpl } = fauxNavigateur()
    const rep = await rendreHtml('https://spa.sn/offre/1', { resolver: resolverPublic, launchImpl })
    expect(rep.statut).toBe(200)
    expect(rep.corps).toContain('contenu rendu par JS')
    expect(etat.ferme).toBe(true)
  })

  it('interception par requête : sous-ressource interne ABORT, publique CONTINUE', async () => {
    const { etat, launchImpl } = fauxNavigateur()
    await rendreHtml('https://spa.sn/offre/1', { resolver: resolverMixte, launchImpl })
    expect(etat.handler).not.toBeNull()

    const interne = route('http://evil.internal/metadata')
    await etat.handler!(interne.r)
    expect(interne.rec.abort).toBe(true)
    expect(interne.rec.continue).toBe(false)

    const publique = route('https://cdn.sn/app.js')
    await etat.handler!(publique.r)
    expect(publique.rec.continue).toBe(true)
    expect(publique.rec.abort).toBe(false)
  })
})
