/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 3) — Le message du scanner doit dire ce qui s'est passé.
 *
 * L'écran affichait « Présent confirmé : <nom> » quel que soit le résultat.
 * Depuis que le même scan sert aussi la sortie, il annoncerait une arrivée à
 * quelqu'un qui part — le staff validerait une information fausse sans le
 * savoir.
 */
import { messageDePassage } from '@/app/checkin/v1/[token]/message-passage'

describe('GUIC-689 (M4) — formulation du passage', () => {
  it('entrée : arrivée confirmée', () => {
    expect(messageDePassage('entree', 'Awa Diop', null)).toMatch(/Awa Diop/)
    expect(messageDePassage('entree', 'Awa Diop', null)).toMatch(/arrivée|présent/i)
  })

  it('sortie avec durée : la durée est annoncée', () => {
    const m = messageDePassage('sortie', 'Awa Diop', 95)
    expect(m).toMatch(/sortie|départ/i)
    // 95 minutes se lit « 1 h 35 », pas « 95 minutes ».
    expect(m).toMatch(/1\s*h\s*35/)
  })

  it('sortie de moins d’une heure : en minutes', () => {
    expect(messageDePassage('sortie', 'Awa Diop', 45)).toMatch(/45\s*min/)
  })

  it('sortie de 0 minute : dit zéro, n’omet pas la durée', () => {
    // Une visite éclair est une mesure réelle ; taire la durée la ferait passer
    // pour non mesurée.
    expect(messageDePassage('sortie', 'Awa Diop', 0)).toMatch(/0\s*min/)
  })

  it('sortie NON appariée : aucune durée inventée', () => {
    const m = messageDePassage('sortie', 'Awa Diop', null)
    expect(m).toMatch(/sortie|départ/i)
    expect(m).not.toMatch(/\d+\s*(min|h)/)
    // Le staff doit comprendre pourquoi : l'entrée n'a pas été retrouvée.
    expect(m).toMatch(/entrée/i)
  })

  it('le nom apparaît toujours — c’est ce que le staff vérifie de visu', () => {
    for (const m of [
      messageDePassage('entree', 'Moussa Ba', null),
      messageDePassage('sortie', 'Moussa Ba', 12),
      messageDePassage('sortie', 'Moussa Ba', null),
    ]) {
      expect(m).toMatch(/Moussa Ba/)
    }
  })
})
