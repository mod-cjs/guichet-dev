import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RichTextEditor } from './index'
import { RichContent } from '../RichContent'

const meta: Meta<typeof RichTextEditor> = {
  title: 'UI/RichTextEditor',
  component: RichTextEditor,
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof RichTextEditor>

export const Default: Story = {
  render: () => {
    const [html, setHtml] = useState(
      '<h2>Mission</h2><p>Un rôle <strong>clé</strong> au sein de l’équipe.</p><ul><li>Point un</li><li>Point deux</li></ul>',
    )
    return (
      <div className="max-w-2xl space-y-6">
        <RichTextEditor
          label="Description"
          hint="Titres, gras, italique, listes, citation, lien, image — style CJS bridé."
          value={html}
          onChange={setHtml}
        />
        <div>
          <p className="text-fs-200 font-bold text-color-text-muted mb-2">Aperçu (rendu lecture)</p>
          <RichContent html={html} />
        </div>
      </div>
    )
  },
}

export const Empty: Story = {
  render: () => {
    const [html, setHtml] = useState('')
    return (
      <div className="max-w-2xl">
        <RichTextEditor
          label="Contenu"
          placeholder="Rédigez la description de l’opportunité…"
          value={html}
          onChange={setHtml}
        />
      </div>
    )
  },
}

export const WithError: Story = {
  render: () => {
    const [html, setHtml] = useState('')
    return (
      <div className="max-w-2xl">
        <RichTextEditor
          label="Description"
          error="La description est obligatoire."
          value={html}
          onChange={setHtml}
        />
      </div>
    )
  },
}
