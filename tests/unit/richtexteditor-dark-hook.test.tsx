/** @jest-environment jsdom */
/**
 * GUIC-687 — garde-fou theming sombre : le wrapper du RichTextEditor DOIT porter la classe
 * `.gj-rte`. Sans elle, la règle scopée [data-admin-theme="dark"] .gj-rte ne s'applique pas
 * et l'éditeur (codé bg-white) reste blanc/illisible en admin sombre.
 */
import { render } from '@testing-library/react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

it('le wrapper porte la classe .gj-rte (hook de theming sombre)', () => {
  const { container } = render(<RichTextEditor label="Description" value="" onChange={() => {}} />)
  expect(container.querySelector('.gj-rte')).not.toBeNull()
})
