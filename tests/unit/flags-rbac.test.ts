/**
 * @jest-environment node
 *
 * GUIC-706 — Qui a le droit de masquer une fonctionnalité.
 *
 * `ADMIN_ROLES` contient `moderator`, dont le métier est de valider des offres. Réutiliser
 * `isAdminRole` pour l'écriture des flags lui donnerait le pouvoir de masquer l'agenda
 * pour 22 000 personnes. On sépare donc lecture et écriture, comme le fait déjà
 * `src/lib/ia/admin/rbac.ts` pour les outils Yaye.
 */
import { canManageFlags, canViewFlags } from '@/lib/flags/rbac'

describe('canViewFlags — lecture', () => {
  it('ouvre la consultation à tous les rôles d’administration', () => {
    // Un modérateur doit pouvoir constater qu'un module est masqué : sans cela il
    // conclurait à une panne devant une file de modération vide.
    expect(canViewFlags(['admin'])).toBe(true)
    expect(canViewFlags(['super_admin'])).toBe(true)
    expect(canViewFlags(['moderator'])).toBe(true)
  })

  it('la refuse à tout rôle non administratif', () => {
    expect(canViewFlags(['conseiller'])).toBe(false)
    expect(canViewFlags(['recruteur'])).toBe(false)
    expect(canViewFlags(['beneficiaire'])).toBe(false)
    expect(canViewFlags([])).toBe(false)
    expect(canViewFlags(null)).toBe(false)
  })
})

describe('canManageFlags — écriture', () => {
  it('n’autorise que l’administration nationale', () => {
    expect(canManageFlags(['admin'])).toBe(true)
    expect(canManageFlags(['super_admin'])).toBe(true)
  })

  it('refuse le modérateur', () => {
    // Le cœur de la garde : modérer une offre et couper une fonctionnalité pour toute la
    // plateforme ne sont pas le même acte.
    expect(canManageFlags(['moderator'])).toBe(false)
  })

  it('refuse un modérateur même s’il cumule des rôles métier', () => {
    expect(canManageFlags(['moderator', 'conseiller', 'beneficiaire'])).toBe(false)
  })

  it('autorise un admin qui cumule des rôles métier', () => {
    expect(canManageFlags(['conseiller', 'admin'])).toBe(true)
  })

  it('refuse l’absence de rôle', () => {
    expect(canManageFlags([])).toBe(false)
    expect(canManageFlags(null)).toBe(false)
    expect(canManageFlags(undefined)).toBe(false)
  })
})
