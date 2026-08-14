/**
 * @jest-environment jsdom
 *
 * GUIC-706 — Panneau des fonctionnalités : navigation et lisibilité.
 *
 * Le catalogue compte 36 entrées. Rendues d'un bloc, elles produisent une page qu'on
 * parcourt au défilement plutôt qu'on ne consulte — et l'administrateur y perd
 * précisément ce dont il a besoin au moment d'ouvrir : voir d'un coup d'œil ce qui est
 * masqué. D'où des onglets, une recherche et un décompte.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FonctionnalitesForm } from '@/app/admin/systeme/fonctionnalites/FonctionnalitesForm'
import { FEATURE_FLAGS } from '@/lib/flags/catalog'

const OUVERT: Record<string, boolean> = Object.fromEntries(
  FEATURE_FLAGS.map((f) => [f.key, true]),
)

function afficher(over: Record<string, boolean> = {}, canManage = true) {
  return render(
    <FonctionnalitesForm
      catalogue={FEATURE_FLAGS}
      initialFlags={{ ...OUVERT, ...over }}
      hits={{}}
      canManage={canManage}
    />,
  )
}

/** Nombre de lignes de fonctionnalité actuellement rendues. */
const lignes = () => screen.getAllByRole('switch').length

describe('navigation par onglets', () => {
  it('n’affiche qu’un sous-ensemble du catalogue à la fois', () => {
    afficher()
    // Le point de la refonte : on ne rend jamais les 36 d'un coup.
    expect(lignes()).toBeGreaterThan(0)
    expect(lignes()).toBeLessThan(FEATURE_FLAGS.length)
  })

  it('couvre l’intégralité du catalogue en parcourant les onglets', async () => {
    // Un découpage qui perdrait une fonctionnalité en route serait pire que la liste
    // longue : l'administrateur ne pourrait plus la basculer du tout.
    afficher()
    const onglets = screen.getAllByRole('tab')
    let total = 0
    for (const onglet of onglets) {
      await userEvent.click(onglet)
      total += lignes()
    }
    expect(total).toBe(FEATURE_FLAGS.length)
  })

  it('annonce le nombre de fonctionnalités de chaque onglet', () => {
    afficher()
    const somme = screen
      .getAllByRole('tab')
      .reduce((n, t) => n + Number(t.textContent?.match(/\d+/)?.[0] ?? 0), 0)
    expect(somme).toBe(FEATURE_FLAGS.length)
  })

  it('change de contenu quand on change d’onglet', async () => {
    afficher()
    const [premier, second] = screen.getAllByRole('tab')
    const avant = screen.getAllByRole('switch').map((s) => s.getAttribute('aria-label'))
    await userEvent.click(second ?? premier)
    const apres = screen.getAllByRole('switch').map((s) => s.getAttribute('aria-label'))
    expect(apres).not.toEqual(avant)
  })
})

describe('recherche', () => {
  it('atteint une fonctionnalité sans changer d’onglet', async () => {
    // Sans recherche transverse, retrouver un flag suppose de deviner son onglet.
    afficher()
    const cible = FEATURE_FLAGS.find((f) => f.label.includes('WhatsApp'))!
    await userEvent.type(screen.getByRole('searchbox'), 'whatsapp')
    expect(screen.getByLabelText(new RegExp(cible.label, 'i'))).toBeInTheDocument()
  })

  it('indique l’absence de résultat plutôt que de rendre une page vide', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'zzzzzz')
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
    expect(screen.getByText(/aucune fonctionnalité/i)).toBeInTheDocument()
  })
})

describe('décompte d’état', () => {
  it('met en avant ce qui est masqué', () => {
    // L'information que l'administrateur cherche en arrivant : y a-t-il quelque chose de
    // fermé, et combien.
    const masque = FEATURE_FLAGS.find((f) => !f.locked)!.key
    afficher({ [masque]: false })
    expect(screen.getByTestId('resume-masquees')).toHaveTextContent('1')
  })

  it('signale explicitement qu’aucune fonctionnalité n’est masquée', () => {
    afficher()
    expect(screen.getByTestId('resume-masquees')).toHaveTextContent('0')
  })
})

describe('lecture seule', () => {
  it('neutralise toutes les bascules pour un modérateur', () => {
    afficher({}, false)
    for (const s of screen.getAllByRole('switch')) expect(s).toBeDisabled()
  })
})

describe('fonctionnalités verrouillées', () => {
  it('rend le socle visible mais non basculable', async () => {
    afficher()
    const onglets = screen.getAllByRole('tab')
    for (const onglet of onglets) {
      await userEvent.click(onglet)
      const zone = screen.getByTestId('liste-fonctionnalites')
      const verrouilles = within(zone).queryAllByText(/non masquable/i)
      for (const v of verrouilles) {
        // Le socle doit rester consultable — le masquer donnerait l'illusion d'un
        // catalogue incomplet — mais son interrupteur est inerte.
        expect(v.closest('li')?.querySelector('[role="switch"]')).toBeDisabled()
      }
    }
  })
})
