/**
 * @jest-environment node
 *
 * GUIC-153 — challenge du 19/08 : `seedOpportunite()` typait `type`/`domaine`/`region` en
 * `string` générique puis forçait via `as never` — c'est exactement ce qui a laissé passer
 * silencieusement `domaine: 'Numerique'` (retiré par la refonte de la taxonomie) jusqu'à
 * l'exécution réelle en CI. Ce test n'exécute rien contre une vraie base — il vérifie
 * uniquement, au compile-time (`tsc --noEmit`, déjà obligatoire avant chaque commit/push),
 * qu'une valeur invalide est désormais rejetée par le typeur plutôt que découverte à
 * l'exécution du prochain run E2E.
 *
 * N'importe QUE le type de la fonction, ne l'appelle jamais (pas de connexion DB requise ici).
 */
import type { seedOpportunite } from './seed-e2e'

type Opts = NonNullable<Parameters<typeof seedOpportunite>[0]>

describe('GUIC-153 — seedOpportunite : type/domaine/region rejetés au compile-time si invalides', () => {
  it('une valeur de domaine retirée par la refonte de taxonomie est rejetée par le typeur', () => {
    // @ts-expect-error — 'Numerique' n'existe plus dans l'enum Domaine (refonte taxonomie)
    const invalide: Opts = { domaine: 'Numerique' }
    void invalide
    expect(true).toBe(true)
  })

  it('un type d\'opportunité inventé est rejeté par le typeur', () => {
    // @ts-expect-error — 'CDI' n'est pas une valeur de l'enum TypeOpportunite
    const invalide: Opts = { type: 'CDI' }
    void invalide
    expect(true).toBe(true)
  })

  it('une région inventée est rejetée par le typeur', () => {
    // @ts-expect-error — 'Paris' n'est pas une valeur de l'enum Region (Sénégal)
    const invalide: Opts = { region: 'Paris' }
    void invalide
    expect(true).toBe(true)
  })

  it('les vraies valeurs de la taxonomie courante restent acceptées', () => {
    const valide: Opts = { type: 'Stage', domaine: 'Employabilite', region: 'Dakar' }
    expect(valide.domaine).toBe('Employabilite')
  })
})
