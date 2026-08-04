/**
 * GUIC-689 — Le fil d'Ariane ne doit jamais proposer un lien vers un segment
 * d'URL qui n'a pas de page.
 *
 * Défaut constaté au rendu (balayage fonctionnel des 46 routes) :
 * `/jeune/parametres/notifications` déclenchait un
 * `GET /jeune/parametres?_rsc=… → 404` à chaque affichage — le prefetch Next
 * du crumb intermédiaire « Paramètres », qui pointe vers un dossier de
 * regroupement sans `page.tsx`. Un utilisateur qui clique ce crumb tombe sur
 * un 404.
 *
 * C'est la même classe de bug que GUIC-446 (`/jeune` sans page → crumb
 * redirigé vers le dashboard), jamais généralisée aux segments intermédiaires.
 *
 * Règle R1 du standard qualité (`design-v5-standard-qualite.md`) : un contrôle
 * mort est pire que pas de contrôle. Le crumb reste affiché — il porte
 * l'information de hiérarchie — mais sans lien (`href: null`).
 */
import { buildBreadcrumbs } from '@/components/layout/BenefTopBar/buildBreadcrumbs'

describe('GUIC-689 — aucun crumb vers un segment sans page', () => {
  it('« Paramètres » est affiché sans lien', () => {
    const crumbs = buildBreadcrumbs('/jeune/parametres/notifications')
    expect(crumbs[1]).toEqual({ label: 'Paramètres', href: null })
  })

  it('le dernier segment, lui, reste navigable', () => {
    const crumbs = buildBreadcrumbs('/jeune/parametres/notifications')
    expect(crumbs[2].href).toBe('/jeune/parametres/notifications')
  })

  it('« Candidature » (dossier de regroupement) est sans lien', () => {
    const crumbs = buildBreadcrumbs('/jeune/candidature/profil-incomplet')
    expect(crumbs[1].href).toBeNull()
  })

  it('un segment qui a bien une page reste navigable', () => {
    const crumbs = buildBreadcrumbs('/jeune/mes-candidatures')
    expect(crumbs[1]).toEqual({ label: 'Mes candidatures', href: '/jeune/mes-candidatures' })
  })

  it('la racine « Mon espace » garde sa cible explicite (GUIC-446 non régressé)', () => {
    const crumbs = buildBreadcrumbs('/jeune/mon-profil')
    expect(crumbs[0]).toEqual({ label: 'Mon espace', href: '/jeune/tableau-de-bord' })
  })
})
