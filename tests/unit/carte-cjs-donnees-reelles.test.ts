/**
 * @jest-environment node
 *
 * GUIC-689 — La carte de membre ne doit plus rien fabriquer.
 *
 * Deux valeurs étaient inventées à l'affichage :
 *
 *  1. le **matricule**, composé à la volée à partir des initiales et de six
 *     caractères de l'UUID (`GJS · AD · 009AC3`). Il ressemblait à un
 *     identifiant officiel sans en être un : non garanti unique, impossible à
 *     retrouver côté back-office, et il exposait un fragment du `cjsUid` —
 *     l'identifiant technique inter-plateformes — sur un support imprimé.
 *
 *  2. la **date d'adhésion**, qui retombait sur un tiret et lisait par ailleurs
 *     `ProfilJeune.createdAt` — la date de création du PROFIL, pas de
 *     l'inscription. Un membre de 2019 ayant complété son profil en 2026
 *     s'affichait « membre depuis 2026 ».
 *
 * `Utilisateur.matricule` et `Utilisateur.createdAt` existent désormais : la
 * carte lit la donnée au lieu de la reconstituer.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RACINE = process.cwd()
const PAGE = resolve(RACINE, 'src/app/jeune/(app)/ma-carte/page.tsx')

describe('GUIC-689 — plus aucune donnée fabriquée sur la carte', () => {
  // On juge le CODE : la documentation a le droit de citer l'ancien format
  // pour expliquer pourquoi il a disparu.
  const src = readFileSync(PAGE, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

  it('ne compose plus le matricule à partir des initiales et de l’UUID', () => {
    expect(src).not.toMatch(/GJS\s*·/)
    expect(src).not.toMatch(/cjsUid\.slice/)
  })

  it('lit le matricule persisté', () => {
    expect(src).toMatch(/matricule:\s*true|matricule\b/)
    expect(src).toMatch(/utilisateur/i)
  })

  it('ne retombe pas sur un tiret de remplissage', () => {
    // Un « — » affiché à la place d'une date fait croire à une donnée absente
    // alors qu'elle existe.
    expect(src).not.toMatch(/membreDepuis\s*=\s*'—'/)
  })

  it('date d’adhésion prise sur le COMPTE, pas sur le profil', () => {
    // `ProfilJeune.createdAt` date la création du profil, pas l'inscription.
    expect(src).not.toMatch(/profilJeune[\s\S]{0,120}createdAt/)
  })
})
