/**
 * @jest-environment jsdom
 *
 * GUIC-670 — À l'ouverture du chat Yaye, le curseur doit être sur l'input pour écrire
 * sans cliquer. Avant : le focus allait sur le bouton Fermer (closeBtnRef).
 */
import { render, screen, waitFor } from '@testing-library/react'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

beforeAll(() => {
  // jsdom : APIs non implémentées, utilisées par l'auto-scroll du panel.
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      dispatchEvent() { return false }, onchange: null,
    })) as unknown as typeof window.matchMedia
  }
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
})

describe('GUIC-670 — focus input Yaye', () => {
  it('à l’ouverture, le curseur est sur l’input (pas besoin de cliquer)', async () => {
    render(
      <YayeSidePanel open onClose={() => {}} composerValue="" onComposerChange={() => {}} onSend={() => {}} />,
    )
    const input = screen.getByLabelText('Message à Yaye')
    await waitFor(() => expect(document.activeElement).toBe(input))
  })
})
