/**
 * @jest-environment node
 *
 * GUIC-712 — Le consentement s'impose à tous les espaces, administration comprise.
 *
 * Personne n'est exempté : ni l'admin national, ni le conseiller, ni le recruteur. Un
 * espace qui échapperait au bandeau serait un espace où l'on dépose sans avoir demandé,
 * et l'exemption la plus probable n'est pas décidée — elle s'installe par oubli, le jour
 * où quelqu'un ajoute un layout racine pour un espace.
 *
 * Ces gardes sont structurelles à dessein : elles ne vérifient pas que le bandeau
 * s'affiche ici ou là, elles vérifient qu'il n'existe aucun endroit d'où il puisse
 * manquer.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const APP = join(process.cwd(), 'src', 'app')

function layouts(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) return layouts(chemin)
    return entree === 'layout.tsx' ? [chemin] : []
  })
}

const LAYOUTS = layouts(APP).map((chemin) => ({
  chemin: chemin.slice(process.cwd().length + 1),
  source: readFileSync(chemin, 'utf8'),
}))

describe('un seul point de montage, pour tout le monde', () => {
  it('n’a qu’un seul layout racine', () => {
    // Un second layout racine (groupe de routes avec son propre <html>) créerait un
    // espace hors de portée du bandeau, sans que rien ne le signale.
    // `<html` en début de ligne : la balise JSX, pas une mention en commentaire —
    // `jeune/(app)/layout.tsx` en cite une pour décrire le script de thème.
    const racines = LAYOUTS.filter(({ source }) => /^\s*<html[\s>]/m.test(source))
    expect(racines.map((r) => r.chemin)).toEqual(['src/app/layout.tsx'])
  })

  it('monte le bandeau dans ce layout racine', () => {
    const racine = LAYOUTS.find((l) => l.chemin === 'src/app/layout.tsx')!
    expect(racine.source).toMatch(/<CookieConsent\s*\/>/)
  })

  it('ne le monte nulle part ailleurs', () => {
    // Un second montage donnerait deux bandeaux superposés sur l'espace concerné.
    const montages = LAYOUTS.filter(({ source }) => source.includes('<CookieConsent'))
    expect(montages.map((m) => m.chemin)).toEqual(['src/app/layout.tsx'])
  })
})

describe('aucune exemption possible', () => {
  const bandeau = readFileSync(
    join(process.cwd(), 'src', 'components', 'consent', 'CookieConsent.tsx'),
    'utf8',
  )

  it('ne consulte ni session, ni rôle', () => {
    // GUIC-706 exempte l'administration du masquage des fonctionnalités ; le
    // consentement obéit à la règle inverse. Un flag ferme un module, il ne dispense pas
    // de demander l'accord de la personne — l'admin est un utilisateur comme un autre
    // dès qu'on dépose sur son appareil.
    for (const marqueur of ['getSession', 'isAdminRole', 'ADMIN_ROLES', 'session.roles']) {
      expect(bandeau).not.toContain(marqueur)
    }
  })

  it('ne dépend d’aucun drapeau de fonctionnalité', () => {
    // Un bandeau derrière un flag serait un bandeau qu'on peut éteindre — donc une
    // promesse de l'Article 7 qu'un réglage suffit à rompre.
    expect(bandeau).not.toMatch(/lib\/flags/)
  })
})
