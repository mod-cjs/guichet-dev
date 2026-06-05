/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MyCJSCard } from '@/components/ui/MyCJSCard'

describe('<MyCJSCard />', () => {
  const baseProps = {
    cjsUid: '9e7c2a1b-4f5a-4d8c-bc12-ef98ad12cd34',
    prenom: 'Awa',
    nom:    'Diop',
  }

  it('rend avec les props minimales (cjsUid + prenom + nom)', () => {
    render(<MyCJSCard {...baseProps} />)
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
    expect(screen.getByText('Membre CJS')).toBeInTheDocument()
    expect(screen.getByLabelText(/QR de membre CJS/i)).toBeInTheDocument()
  })

  it('génère le matricule format `GJS · XX · XXXXXX`', () => {
    render(<MyCJSCard {...baseProps} />)
    // 9e7c2a1b-4f5a... → strip dashes, slice(0,6) → "9E7C2A"
    expect(screen.getByText('GJS · AD · 9E7C2A')).toBeInTheDocument()
  })

  it('rend le même pattern QR pour le même cjsUid (déterministe)', () => {
    const { container: c1, unmount } = render(<MyCJSCard {...baseProps} />)
    const html1 = c1.querySelector('svg[role="img"]')?.innerHTML
    unmount()
    const { container: c2 } = render(<MyCJSCard {...baseProps} />)
    const html2 = c2.querySelector('svg[role="img"]')?.innerHTML
    expect(html1).toBeTruthy()
    expect(html1).toEqual(html2)
  })

  it('affiche le centre si fourni, et l\'omet sinon', () => {
    const { rerender } = render(<MyCJSCard {...baseProps} centre="CJS Kolda" />)
    expect(screen.getByText('CJS Kolda')).toBeInTheDocument()

    rerender(<MyCJSCard {...baseProps} />)
    expect(screen.queryByText(/CJS Kolda/)).not.toBeInTheDocument()
  })
})
