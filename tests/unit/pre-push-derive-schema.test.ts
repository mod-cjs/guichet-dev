/**
 * @jest-environment node
 *
 * GUIC-689 — `pre-push` doit refuser une base qui a dérivé du schéma.
 *
 * Panne réelle du 2026-08-17 : chaque worktree a désormais sa propre base
 * (`scripts/dev/isolate-worktree-db.sh`), mais l'alignement est MANUEL. Après un
 * changement de branche vers un schéma différent, on teste contre une base qui
 * ne correspond plus au code — et la suite passe ou échoue pour de mauvaises
 * raisons. C'est ce qui est arrivé avec l'enum `Domaine` : la base portait six
 * valeurs, la branche neuf.
 *
 * Le hook attrape ce cas précis. Il ne remplace pas le script d'isolation, il
 * empêche de pousser un vert obtenu contre la mauvaise base.
 *
 * Trois exigences, chacune née d'un piège :
 *
 *  1. il tourne AVANT les tests — sinon on paie 90 s pour un résultat qui ne
 *     veut rien dire ;
 *  2. il ne bloque JAMAIS quand la base est simplement injoignable (CI sans
 *     conteneur, poste sans Docker) : un garde-fou qui crie à tort finit
 *     contourné, et `--no-verify` redevient une habitude ;
 *  3. il nomme la commande qui répare — un refus sans issue fait perdre plus de
 *     temps qu'il n'en fait gagner.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HOOK = readFileSync(resolve(process.cwd(), '.githooks/pre-push'), 'utf-8')

/** Numéro de la première ligne satisfaisant le motif (-1 si absente). */
const ligne = (motif: RegExp) => HOOK.split('\n').findIndex((l) => motif.test(l))

describe('GUIC-689 — garde-fou de dérive de schéma', () => {
  it('le hook compare la base au schéma de la branche', () => {
    expect(ligne(/migrate diff/)).toBeGreaterThan(-1)
    expect(HOOK).toMatch(/--exit-code/)
  })

  it('la vérification passe AVANT les tests', () => {
    const derive = ligne(/migrate diff/)
    const tests = ligne(/npm run test/)
    expect(derive).toBeGreaterThan(-1)
    expect(tests).toBeGreaterThan(-1)
    // Sinon on découvre la dérive après 90 s de suite inutile.
    expect(derive).toBeLessThan(tests)
  })

  it('une base injoignable ne bloque pas le push', () => {
    // Le garde-fou vise la DÉRIVE, pas l'absence de base. Bloquer un poste sans
    // Docker rendrait `--no-verify` routinier — le contraire du but.
    expect(HOOK).toMatch(/injoignable|indisponible|unreachable/i)
  })

  it('le refus nomme la commande qui répare', () => {
    expect(HOOK).toMatch(/isolate-worktree-db\.sh/)
  })

  it('reste désactivable par la variable d’échappement du projet', () => {
    expect(HOOK).toMatch(/GUIC_HOOKS_OFF/)
  })
})
