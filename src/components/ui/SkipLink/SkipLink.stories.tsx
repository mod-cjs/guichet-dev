import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SkipLink } from './index'

const meta: Meta<typeof SkipLink> = {
  title: 'UI/SkipLink',
  component: SkipLink,
  parameters: {
    docs: {
      description: {
        component:
          'Lien d\'évitement clavier (WCAG 2.4.1). Invisible jusqu\'au focus, premier élément focusable du layout. Astuce Storybook : appuie sur Tab pour le faire apparaître.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof SkipLink>

export const Default: Story = {
  render: () => (
    <div style={{ minHeight: 200, padding: 16 }}>
      <SkipLink />
      <p style={{ marginTop: 16 }}>Appuyez sur Tab pour voir apparaître le lien.</p>
      <main id="main" tabIndex={-1} style={{ marginTop: 16 }}>
        Contenu principal.
      </main>
    </div>
  ),
}

export const CustomLabel: Story = {
  render: () => (
    <div style={{ minHeight: 200, padding: 16 }}>
      <SkipLink href="#contenu">Passer au contenu</SkipLink>
      <p style={{ marginTop: 16 }}>Cible personnalisée + libellé personnalisé.</p>
      <main id="contenu" tabIndex={-1}>
        Contenu cible.
      </main>
    </div>
  ),
}
