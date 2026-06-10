/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QRBadge } from '@/components/centres/QRBadge'

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE'),
  },
}))

describe('<QRBadge />', () => {
  it('affiche le skeleton avant que le QR ne soit généré', () => {
    render(<QRBadge url="https://guichetjeunesse.sn/checkin/v1/x" />)
    expect(screen.getByTestId('qr-badge-skeleton')).toBeInTheDocument()
  })

  it('affiche l\'image QR avec alt explicite après génération', async () => {
    render(<QRBadge url="https://guichetjeunesse.sn/checkin/v1/x" />)
    const img = await screen.findByAltText(
      /QR code de check-in carte CJS — code temporaire/i,
    )
    expect(img).toHaveAttribute('src', 'data:image/png;base64,FAKE')
  })

  it('applique la taille demandée sur l\'image', async () => {
    render(<QRBadge url="https://guichetjeunesse.sn/checkin/v1/x" size={180} />)
    const img = await screen.findByAltText(/QR code de check-in/i)
    expect(img).toHaveAttribute('width', '180')
    expect(img).toHaveAttribute('height', '180')
  })

  it('affiche le countdown si expiresAt + showCountdown', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    render(
      <QRBadge
        url="https://guichetjeunesse.sn/checkin/v1/x"
        expiresAt={expiresAt}
        showCountdown
      />,
    )
    await waitFor(() => expect(screen.getByText(/Expire dans/i)).toBeInTheDocument())
  })

  it('affiche le bouton "Rafraîchir" + appelle onRefreshClick quand expiré', async () => {
    const onRefresh = jest.fn()
    const expired = new Date(Date.now() - 1000)
    render(
      <QRBadge
        url="https://guichetjeunesse.sn/checkin/v1/x"
        expiresAt={expired}
        showCountdown
        onRefreshClick={onRefresh}
      />,
    )
    const btn = await screen.findByRole('button', { name: /Rafraîchir/i })
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('affiche "Code expiré" si expiresAt < now', async () => {
    render(
      <QRBadge
        url="https://guichetjeunesse.sn/checkin/v1/x"
        expiresAt={new Date(Date.now() - 1000)}
        showCountdown
      />,
    )
    await waitFor(() => expect(screen.getByText(/Code expiré/i)).toBeInTheDocument())
  })
})
