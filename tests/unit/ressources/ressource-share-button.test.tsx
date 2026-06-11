/**
 * GUIC-363 — Unit tests `<RessourceShareButton />`.
 *
 * Couvre :
 *  1. Web Share API utilisée si disponible
 *  2. Fallback clipboard quand navigator.share absent
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RessourceShareButton } from '@/components/ressources/RessourceShareButton'

describe('<RessourceShareButton />', () => {
  const origShare = (globalThis.navigator as Navigator).share
  const origClipboard = (globalThis.navigator as Navigator).clipboard

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      writable: true,
      value: origShare,
    })
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: origClipboard,
    })
  })

  it('appelle navigator.share quand l’API est disponible', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      writable: true,
      value: shareMock,
    })

    render(
      <RessourceShareButton
        title="Ma ressource"
        text="Un guide"
        url="https://example.com/r/1"
      />,
    )

    fireEvent.click(screen.getByTestId('ressource-share-btn'))

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1))
    expect(shareMock).toHaveBeenCalledWith({
      title: 'Ma ressource',
      text: 'Un guide',
      url: 'https://example.com/r/1',
    })
    expect(await screen.findByTestId('ressource-share-btn-feedback')).toHaveTextContent(/Partagé/i)
  })

  it('fallback clipboard quand navigator.share absent', async () => {
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    render(<RessourceShareButton title="T" url="https://example.com/r/2" />)

    fireEvent.click(screen.getByTestId('ressource-share-btn'))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://example.com/r/2'))
    expect(await screen.findByTestId('ressource-share-btn-feedback')).toHaveTextContent(/Lien copié/i)
  })
})
