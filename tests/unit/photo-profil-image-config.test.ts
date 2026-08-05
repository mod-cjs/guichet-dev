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
  // Attention : sans query, la valeur comparée est la chaîne VIDE, pas « ? ».
  const searchReel = search ? `?${search}` : ''
  if (motif.search !== undefined && motif.search !== searchReel) return false
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

  /**
   * Deuxième moitié du défaut, trouvée au rendu après le premier correctif : la
   * page ne renvoyait plus 500, mais l'image restait en 400 —
   * « The requested resource isn't a valid image … received null ».
   *
   * `/api/profil/photo/file` exige une session. L'optimiseur `next/image` va
   * chercher la source **côté serveur, sans le cookie du visiteur** : il reçoit
   * 401, donc aucune image. Une ressource privée authentifiée ne peut pas
   * passer par l'optimiseur — il faut la servir telle quelle, le navigateur
   * joignant son cookie.
   */
  it('la photo de profil n’est jamais confiée à l’optimiseur (ressource authentifiée)', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    for (const rel of [
      'src/components/profil/ProfileHeroBand.tsx',
      'src/components/ui/Avatar/index.tsx',
    ]) {
      const src = readFileSync(resolve(__dirname, '../../', rel), 'utf-8')
      if (!/getProfilePhotoUrl|photoUrl/.test(src)) continue
      if (!/from 'next\/image'/.test(src)) continue
      expect(src).toMatch(/unoptimized/)
    }
  })

  /**
   * Déclarer `localPatterns` REMPLACE le défaut de Next (`/**` sans query) :
   * n'y mettre que la route photo a cassé toutes les autres images locales —
   * le logo du shell est passé en 400. Le fourre-tout général doit donc rester,
   * mais pinné sur `search: ''` : ouvrir les query strings à toute route locale
   * exposerait l'optimiseur à n'importe quel endpoint.
   */
  it('les fichiers statiques locaux restent servables', () => {
    expect(motifsLocaux().some((m) => motifAccepte(m, '/logo-guichet.png'))).toBe(true)
  })

  it('aucune route locale quelconque n’est ouverte AVEC query string', () => {
    for (const m of motifsLocaux()) {
      if (m.pathname === '/**') expect(m.search).toBe('')
    }
    expect(motifsLocaux().some((m) => motifAccepte(m, '/api/admin/export?tout=1'))).toBe(false)
  })
})
