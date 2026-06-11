/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreContactCard } from '@/components/centres/CentreContactCard'

describe('<CentreContactCard />', () => {
  it('rend un lien tel: avec le téléphone brut', () => {
    render(<CentreContactCard telephone="+221339812020" />)
    const tel = screen.getByRole('link', { name: /Appeler/i })
    expect(tel).toHaveAttribute('href', 'tel:+221339812020')
  })

  it('rend un lien mailto: si email présent', () => {
    render(
      <CentreContactCard
        telephone="+221339812020"
        email="tambacounda@cjs.sn"
      />,
    )
    const mail = screen.getByRole('link', { name: /Envoyer un email/i })
    expect(mail).toHaveAttribute('href', 'mailto:tambacounda@cjs.sn')
  })

  it('appelle onPhoneClick / onEmailClick', () => {
    const onPhone = jest.fn()
    const onEmail = jest.fn()
    render(
      <CentreContactCard
        telephone="+221339812020"
        email="x@y.sn"
        onPhoneClick={onPhone}
        onEmailClick={onEmail}
      />,
    )
    fireEvent.click(screen.getByRole('link', { name: /Appeler/i }))
    fireEvent.click(screen.getByRole('link', { name: /Envoyer un email/i }))
    expect(onPhone).toHaveBeenCalledTimes(1)
    expect(onEmail).toHaveBeenCalledTimes(1)
  })

  it('ne rend pas le lien email si email absent', () => {
    render(<CentreContactCard telephone="+221339812020" email={null} />)
    expect(
      screen.queryByRole('link', { name: /Envoyer un email/i }),
    ).not.toBeInTheDocument()
  })

  it('applique tap-min 44px sur les liens', () => {
    render(<CentreContactCard telephone="+221339812020" email="a@b.sn" />)
    const tel = screen.getByRole('link', { name: /Appeler/i })
    const mail = screen.getByRole('link', { name: /Envoyer un email/i })
    expect(tel.getAttribute('style')).toMatch(/min-height:\s*44px/i)
    expect(mail.getAttribute('style')).toMatch(/min-height:\s*44px/i)
  })
})
