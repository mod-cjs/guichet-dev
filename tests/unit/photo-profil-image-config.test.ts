/**
 * @jest-environment node
 *
 * GUIC-689 — La photo de profil doit être servable par `next/image`.
 *
 * DÉFAUT CONSTATÉ AU RENDU : dès qu'un bénéficiaire a une photo,
 * `/jeune/mon-profil` renvoie **500** :
 *
 *   Image with src "/api/profil/photo/file?cb=…" is using a query string
 *   which is not configured in images.localPatterns
 *
 * `getProfilePhotoUrl` ajoute un paramètre anti-cache `?cb=<cjsUid>` — utile,
 * sans lui le navigateur resservait l'ancienne photo après changement. Mais
 * Next 16 refuse toute image locale à query string tant qu'un `localPatterns`
 * ne l'autorise pas explicitement.
 *
 * Le défaut est resté invisible tant qu'aucun compte de test n'avait de photo :
 * ni les tests unitaires (jsdom ne fait pas tourner la config Next), ni le
 * balayage de routes (les comptes n'avaient pas de photo) ne pouvaient le voir.
 *
 * Ce test verrouille l'ACCORD entre les deux : l'URL que le code produit doit
 * être acceptée par la configuration. Changer l'un sans l'autre casse ici, au
 * lieu de casser en production.
 */
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'
import nextConfig from '../../next.config'

interface MotifLocal {
  pathname?: string
  search?: string
}

function motifsLocaux(): MotifLocal[] {
  const images = (nextConfig as { images?: { localPatterns?: MotifLocal[] } }).images
  return images?.localPatterns ?? []
}

/** Reproduit la validation de Next : le pathname doit matcher le motif glob. */
function motifAccepte(motif: MotifLocal, url: string): boolean {
  const [pathname, search] = url.split('?')
  if (motif.pathname) {
    const re = new RegExp(
      '^' + motif.pathname.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*') + '$',
    )
    if (!re.test(pathname)) return false
  }
  // `search` non renseigné = query string quelconque acceptée.
  if (motif.search !== undefined && motif.search !== `?${search ?? ''}`) return false
  return true
}

describe('GUIC-689 — photo de profil servable par next/image', () => {
  const URL_PHOTO = getProfilePhotoUrl('009ac325-d7e6-488b-890e-fc13bfb1d7e0', true)

  it('l’URL produite porte bien une query string (anti-cache)', () => {
    expect(URL_PHOTO).toBeDefined()
    expect(URL_PHOTO).toContain('?')
  })

  it('la configuration déclare des motifs locaux', () => {
    expect(motifsLocaux().length).toBeGreaterThan(0)
  })

  it('l’URL de photo est acceptée par au moins un motif local', () => {
    expect(motifsLocaux().some((m) => motifAccepte(m, URL_PHOTO!))).toBe(true)
  })

  it('les motifs ne sont pas des passe-partout — seul le chemin photo est ouvert', () => {
    // Un `pathname: '/**'` ferait passer ce test tout en ouvrant l'optimiseur
    // d'images à n'importe quelle route locale : on l'interdit.
    for (const m of motifsLocaux()) {
      expect(m.pathname).toBeDefined()
      expect(m.pathname).not.toBe('/**')
    }
    expect(motifsLocaux().some((m) => motifAccepte(m, '/api/admin/export?tout=1'))).toBe(false)
  })
})
