/**
 * @jest-environment node
 *
 * GUIC-689 — Aucun filtre de ressources ne doit être décoratif.
 *
 * Une sentinelle équivalente protège déjà les opportunités (É-24) : elle est née
 * d'un défaut réel — « Rémunération » et « Deadline » étaient écrits dans l'URL,
 * comptés comme filtres actifs, et jamais lus côté serveur. L'utilisateur voyait
 * un résultat FAUX en croyant l'avoir filtré.
 *
 * Rien n'équivalent ne couvrait les ressources. Vérification faite, leurs filtres
 * sont bien lus aujourd'hui — ce test empêche la dérive, il ne corrige pas un
 * défaut existant.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RACINE = process.cwd()
const lire = (p: string) => readFileSync(resolve(RACINE, p), 'utf-8')

/** Champs déclarés par le contrat de filtres. */
function champsDuContrat(): string[] {
  const src = lire('src/lib/loaders/ressources.ts')
  const bloc = src.slice(src.indexOf('interface RessourceFiltres'))
  const fin = bloc.indexOf('\n}')
  return [...bloc.slice(0, fin).matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])
}

describe('GUIC-689 — chaque filtre exposé est réellement lu', () => {
  const champs = champsDuContrat()

  it('le contrat de filtres est bien lu par ce test', () => {
    // Garde-fou du garde-fou : une liste vide ferait passer le test suivant à vide.
    expect(champs.length).toBeGreaterThan(4)
  })

  it('aucun champ du contrat n’est ignoré par le loader', () => {
    const loader = lire('src/lib/loaders/ressources.ts')
    // On regarde la construction du `where` : un champ jamais mentionné après
    // sa déclaration ne filtre rien, quoi qu'affiche l'interface.
    const corps = loader.slice(loader.indexOf('const where'))
    // `page` n'est PAS un filtre : c'est de la pagination, vérifiée séparément.
    // La compter ici ferait échouer la sentinelle pour une bonne raison.
    const filtrants = champs.filter((c) => c !== 'page')
    const ignores = filtrants.filter((c) => !new RegExp(`filtres\\.${c}\\b`).test(corps))
    expect(ignores).toEqual([])
  })

  it('la pagination est bien appliquée, elle aussi', () => {
    const loader = lire('src/lib/loaders/ressources.ts')
    expect(loader).toMatch(/skip|take/)
    expect(loader).toMatch(/filtres\.page/)
  })

  it('l’URL n’expose aucun paramètre absent du contrat', () => {
    // Un paramètre écrit dans l'URL sans exister au contrat serait lu par
    // personne — c'est exactement le défaut corrigé côté opportunités.
    const page = lire('src/app/(public)/ressources/page.tsx')
    const params = [...page.matchAll(/sp\.(\w+)/g)].map((m) => m[1])
    const connus = new Set([...champs, 'categorie', 'programme', 'vue', 'page', 'q'])
    expect([...new Set(params)].filter((p) => !connus.has(p))).toEqual([])
  })
})
