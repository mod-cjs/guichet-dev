/**
 * @jest-environment node
 *
 * GUIC-706 — aucune information de masquage ne franchit la frontière client.
 *
 * LE DÉFAUT QUE CE TEST FERME. Les navigations recevaient la liste des clés masquées en
 * prop pour filtrer leurs liens au rendu. Or React sérialise les props des composants
 * clients dans le HTML : chaque page servie contenait donc `{"masques":["m5.agenda"]}` —
 * y compris pour un visiteur ANONYME, sur l'accueil. N'importe qui lisait dans le code
 * source la liste exacte des fonctionnalités cachées, avec leurs identifiants internes.
 *
 * C'est l'exigence centrale du lancement séquentiel qui tombait : une fonctionnalité
 * masquée doit être indiscernable d'une fonctionnalité qui n'existe pas. Un tableau de
 * clés dans le HTML dit l'inverse — elle existe, et on la cache.
 *
 * LA RÈGLE : le filtrage est un calcul de SERVEUR. Un composant client reçoit la liste
 * qu'il doit afficher, jamais de quoi déduire ce qui en a été retiré.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Tous les fichiers source sous une racine. */
function fichiers(racine: string): string[] {
  return readdirSync(racine).flatMap((nom) => {
    const chemin = join(racine, nom)
    if (statSync(chemin).isDirectory()) return fichiers(chemin)
    return /\.tsx?$/.test(nom) ? [chemin] : []
  })
}

const SOURCES = fichiers('src').map((chemin) => ({
  chemin,
  code: readFileSync(chemin, 'utf8'),
}))

/** Un module client : sa première ligne utile porte la directive. */
const CLIENTS = SOURCES.filter(({ code }) => /^\s*(['"])use client\1/m.test(code.slice(0, 200)))

describe('la frontière', () => {
  it('trouve bien des modules clients', () => {
    // Garde-fou : si la détection casse, les tests suivants passeraient à vide.
    expect(CLIENTS.length).toBeGreaterThan(20)
  })

  it('aucun module client ne déclare une prop de clés masquées', () => {
    const coupables = CLIENTS.filter(({ code }) => /\bmasques\s*[?:]/.test(code)).map((f) => f.chemin)
    expect(coupables).toEqual([])
  })

  it('aucun module client n’importe les aides de filtrage', () => {
    // `lienMasque` et `filtrerSections` prennent des clés de flags en entrée : les appeler
    // côté client suppose de les y avoir transmises.
    const coupables = CLIENTS.filter(({ code }) =>
      /from\s+['"]@\/lib\/flags\/ui['"]/.test(code),
    ).map((f) => f.chemin)
    expect(coupables).toEqual([])
  })

  it('aucun module client ne nomme une clé du catalogue', () => {
    // Dernier filet : une clé écrite en dur (`'m5.agenda'`) atteindrait le navigateur même
    // sans passer par une prop.
    const coupables = CLIENTS.filter(({ code }) => /['"]m\d+\.[a-z_]+['"]/.test(code)).map(
      (f) => f.chemin,
    )
    expect(coupables).toEqual([])
  })
})
