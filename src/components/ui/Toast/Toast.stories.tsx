import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Toast } from './index'

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  args: {
    message: 'Candidature envoyée',
    detail: 'Tu recevras une réponse sous 5 jours.',
    onClose: () => {},
    duration: 0,
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
    position: { control: 'select', options: ['bottom-right', 'bottom-center', 'top-right'] },
  },
}

export default meta

type Story = StoryObj<typeof Toast>

export const Success: Story = { args: { variant: 'success' } }
export const Info: Story = { args: { variant: 'info', message: 'Mise à jour disponible', detail: 'Recharge la page pour profiter.' } }
export const Warning: Story = { args: { variant: 'warning', message: 'Profil incomplet', detail: 'Ajoute ta région pour de meilleures recommandations.' } }
export const Danger: Story = { args: { variant: 'danger', message: 'Erreur réseau', detail: 'Vérifie ta connexion et réessaie.' } }
export const TopRight: Story = { args: { variant: 'info', position: 'top-right' } }
export const BottomRight: Story = { args: { variant: 'success', position: 'bottom-right' } }
