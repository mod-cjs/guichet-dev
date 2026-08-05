/**
 * @jest-environment node
 *
 * GUIC-689 — `PUT /api/profil` doit accepter les champs de la carte
 * « Objectif & secteurs visés ».
 *
 * Sans cette extension, les colonnes créées par la migration resteraient vides
 * à jamais : la carte les affiche, rien ne permet de les saisir. Une vitrine
 * sans porte.
 *
 * On teste le SCHÉMA de validation, pas la route entière : c'est lui qui décide
 * ce qui entre en base, et c'est là que se logent les trous (un tableau non
 * borné, une région inventée, un texte sans limite de taille).
 */
import { PutProfilSchema } from '@/app/api/profil/schema'

const ok = (data: unknown) => PutProfilSchema.safeParse(data).success

describe('GUIC-689 — objectif', () => {
  it('accepte un objectif texte', () => {
    expect(ok({ objectif: 'Lancer une micro-entreprise de maraîchage.' })).toBe(true)
  })

  it('accepte l’effacement explicite', () => {
    expect(ok({ objectif: null })).toBe(true)
  })

  it('refuse un texte démesuré — une colonne TEXT n’est pas une décharge', () => {
    expect(ok({ objectif: 'x'.repeat(2001) })).toBe(false)
  })
})

describe('GUIC-689 — types recherchés', () => {
  it('accepte des types connus', () => {
    expect(ok({ typesRecherches: ['emploi', 'formation'] })).toBe(true)
  })

  it('refuse un type inventé — sinon la carte affiche une clé technique brute', () => {
    expect(ok({ typesRecherches: ['licorne'] })).toBe(false)
  })

  it('accepte la liste vide (le jeune retire tous ses choix)', () => {
    expect(ok({ typesRecherches: [] })).toBe(true)
  })
})

describe('GUIC-689 — régions de mobilité', () => {
  it('accepte des régions du référentiel', () => {
    expect(ok({ regionsMobilite: ['Dakar', 'Thies'] })).toBe(true)
  })

  it('refuse une région hors référentiel', () => {
    expect(ok({ regionsMobilite: ['Paris'] })).toBe(false)
  })

  it('refuse plus de régions qu’il n’en existe', () => {
    expect(ok({ regionsMobilite: Array.from({ length: 20 }, () => 'Dakar') })).toBe(false)
  })
})
