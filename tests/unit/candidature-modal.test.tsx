import { render, screen, fireEvent } from '@testing-library/react'
import { CandidatureModal } from '@/components/opportunites/CandidatureModal'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...a: unknown[]) => push(...a) }),
}))

const viewer = { prenom: 'Aïssa', nom: 'Diallo', telephone: '+221770000000' }

function open(props: Partial<React.ComponentProps<typeof CandidatureModal>> = {}) {
  return render(
    <CandidatureModal
      opportuniteId="o1"
      opportuniteSlug="stage-data"
      opportuniteTitre="Stage Data"
      viewer={viewer}
      isOpen
      onClose={() => {}}
      onSuccess={() => {}}
      {...props}
    />,
  )
}

describe('<CandidatureModal />', () => {
  beforeEach(() => push.mockReset())

  it("affiche le bouton Yaye et navigue vers /jeune/yaye avec slug et from=postuler (GUIC-221 #2)", () => {
    open()
    const btn = screen.getByTestId('yaye-help-button')
    fireEvent.click(btn)
    expect(push).toHaveBeenCalledTimes(1)
    const url = push.mock.calls[0][0] as string
    expect(url).toMatch(/^\/jeune\/yaye\?/)
    expect(url).toContain('from=postuler')
    expect(url).toContain('opp=stage-data')
  })

  it("rend le lien 'Modifier dans mon profil' vers /jeune/mon-profil (GUIC-221 #3)", () => {
    open()
    const link = screen.getByTestId('edit-profile-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/jeune/mon-profil')
  })

  it("conserve le focus sur la textarea pendant la frappe (GUIC-221 #6)", () => {
    open()
    const ta = screen.getByLabelText(/lettre de motivation/i) as HTMLTextAreaElement
    ta.focus()
    expect(document.activeElement).toBe(ta)
    fireEvent.change(ta, { target: { value: 'B' } })
    expect(document.activeElement).toBe(ta)
    fireEvent.change(ta, { target: { value: 'Bonj' } })
    expect(document.activeElement).toBe(ta)
  })
})
